use gather_integrity::*;
use hdk::prelude::*;

use crate::global_collections::{
    all_cancelled_event_proposals, all_cancelled_events, all_open_event_proposals,
    all_upcoming_events, remove_from_collection,
};

#[hdk_extern]
pub fn create_event(event: Event) -> ExternResult<Record> {
    let event_hash = create_entry(&EntryTypes::Event(event.clone()))?;
    let record = get(event_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created Event"))
    ))?;

    let path = crate::global_collections::all_upcoming_events();

    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;

    let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(
        my_agent_pub_key,
        event_hash.clone(),
        LinkTypes::EventsByAuthor,
        (),
    )?;
    Ok(record)
}

#[hdk_extern]
pub fn create_event_proposal(event: Event) -> ExternResult<Record> {
    let event_hash = create_entry(&EntryTypes::Event(event.clone()))?;
    let record = get(event_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created Event"))
    ))?;

    let path = crate::global_collections::all_open_event_proposals();

    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;

    let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(
        my_agent_pub_key,
        event_hash.clone(),
        LinkTypes::EventsByAuthor,
        (),
    )?;
    Ok(record)
}

#[hdk_extern]
pub fn get_event(original_event_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(original_event_hash.clone(), LinkTypes::EventUpdates, None)?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_event_hash = match latest_link {
        Some(link) => ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?,
        None => original_event_hash.clone(),
    };
    let Some(details) =     get_details(latest_event_hash, GetOptions::default())? else {return Ok(None);};
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }?;

    Ok(Some(record))
}

#[hdk_extern]
pub fn get_event_cancellations(
    event_hash: ActionHash,
) -> ExternResult<Option<Vec<SignedHashed<Action>>>> {
    let Some(details) = get_details(event_hash.clone(), GetOptions::default())? else {
        return Ok(None);
    };
    let deletes = match details {
        Details::Record(details) => Ok(details.deletes),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }?;

    Ok(Some(deletes))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateEventInput {
    pub original_event_hash: ActionHash,
    pub previous_event_hash: ActionHash,
    pub updated_event: Event,
}
#[hdk_extern]
pub fn update_event(input: UpdateEventInput) -> ExternResult<Record> {
    let updated_event_hash = update_entry(input.previous_event_hash.clone(), &input.updated_event)?;
    create_link(
        input.original_event_hash.clone(),
        updated_event_hash.clone(),
        LinkTypes::EventUpdates,
        (),
    )?;
    let record = get(updated_event_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly updated Event"))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn cancel_event(original_event_hash: ActionHash) -> ExternResult<()> {
    let record = get(original_event_hash.clone(), GetOptions::default())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Event not found".into())))?;

    let event: Event = record
        .entry
        .to_app_option()
        .map_err(|err| wasm_error!(err))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Hash does not correspond to an event".into()
        )))?;

    remove_from_collection(&original_event_hash, all_upcoming_events())?;
    remove_from_collection(&original_event_hash, all_open_event_proposals())?;

    let response = call(
        CallTargetCell::Local,
        ZomeName::from("assemble"),
        FunctionName::from("get_assemblies_for_call_to_action"),
        None,
        event.call_to_action_hash,
    )?;
    let records: Vec<Record> = match response {
        ZomeCallResponse::Ok(result) => result.decode().map_err(|err| wasm_error!(err))?,
        _ => Err(wasm_error!(WasmErrorInner::Guest(format!(
            "Failed to call assemble: {:?}",
            response
        ))))?,
    };

    let path = if records.len() > 0 {
        all_cancelled_events()
    } else {
        all_cancelled_event_proposals()
    };

    create_link(
        path.path_entry_hash()?,
        original_event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;

    delete_entry(original_event_hash)?;

    Ok(())
}
