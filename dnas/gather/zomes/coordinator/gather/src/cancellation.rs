use gather_integrity::*;
use hdk::prelude::*;

use crate::global_collections::{
    all_cancelled_event_proposals, all_cancelled_events, all_open_event_proposals,
    all_upcoming_events, remove_from_collection,
};

#[hdk_extern]
pub fn cancel_event(cancellation: Cancellation) -> ExternResult<Record> {
    let record = get(cancellation.event_hash.clone(), GetOptions::default())?
        .ok_or(wasm_error!(WasmErrorInner::Guest("Event not found".into())))?;
    let event: Event = record
        .entry
        .to_app_option()
        .map_err(|err| wasm_error!(err))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(
            "Hash does not correspond to an event".into()
        )))?;
    remove_from_collection(&cancellation.event_hash, all_upcoming_events())?;
    remove_from_collection(&cancellation.event_hash, all_open_event_proposals())?;
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
        cancellation.event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;
    let cancellation_hash = create_entry(&EntryTypes::Cancellation(cancellation.clone()))?;
    create_link(
        cancellation.event_hash.clone(),
        cancellation_hash.clone(),
        LinkTypes::EventToCancellations,
        (),
    )?;
    let record = get(cancellation_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from(
            "Could not find the newly created Cancellation"
        ))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn get_cancellation(original_cancellation_hash: ActionHash) -> ExternResult<Option<Record>> {
    get_latest_cancellation(original_cancellation_hash)
}
fn get_latest_cancellation(cancellation_hash: ActionHash) -> ExternResult<Option<Record>> {
    let details = get_details(cancellation_hash, GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Cancellation not found".into())
    ))?;
    let record_details = match details {
        Details::Entry(_) => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed details".into()
        ))),
        Details::Record(record_details) => Ok(record_details),
    }?;
    if record_details.deletes.len() > 0 {
        return Ok(None);
    }
    match record_details.updates.last() {
        Some(update) => get_latest_cancellation(update.action_address().clone()),
        None => Ok(Some(record_details.record)),
    }
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateCancellationInput {
    pub previous_cancellation_hash: ActionHash,
    pub updated_cancellation: Cancellation,
}
#[hdk_extern]
pub fn update_cancellation(input: UpdateCancellationInput) -> ExternResult<Record> {
    let updated_cancellation_hash = update_entry(
        input.previous_cancellation_hash,
        &input.updated_cancellation,
    )?;
    let record = get(updated_cancellation_hash.clone(), GetOptions::default())?.ok_or(
        wasm_error!(WasmErrorInner::Guest(String::from(
            "Could not find the newly updated Cancellation"
        ))),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_cancellation(original_cancellation_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_cancellation_hash)
}
#[hdk_extern]
pub fn get_cancellations_for_event(event_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let links = get_links(event_hash, LinkTypes::EventToCancellations, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| {
            Ok(GetInput::new(
                link.target
                    .into_action_hash()
                    .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
                        "No action hash associated with link"
                    ))))?
                    .into(),
                GetOptions::default(),
            ))
        })
        .collect::<ExternResult<Vec<GetInput>>>()?;
    let records: Vec<Record> = HDK
        .with(|hdk| hdk.borrow().get(get_input))?
        .into_iter()
        .filter_map(|r| r)
        .collect();
    Ok(records)
}
