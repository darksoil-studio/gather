use gather_integrity::*;
use hdk::prelude::*;

use crate::global_collections::{all_open_proposals, all_upcoming_events, remove_from_collection};

#[hdk_extern]
pub fn create_event(event: Event) -> ExternResult<Record> {
    let event_hash = create_entry(&EntryTypes::Event(event.clone()))?;
    let record = get(event_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created Event"))
    ))?;

    let path = all_upcoming_events();

    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::UpcomingEvents,
        (),
    )?;

    let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(
        my_agent_pub_key,
        event_hash.clone(),
        LinkTypes::MyEvents,
        (),
    )?;

    if let Some(from_proposal) = event.from_proposal {
        remove_from_collection(
            &from_proposal.proposal_hash,
            all_open_proposals(),
            LinkTypes::OpenProposals,
        )?;
        create_link(
            from_proposal.proposal_hash,
            event_hash,
            LinkTypes::ProposalToEvent,
            (),
        )?;
    }

    Ok(record)
}

#[hdk_extern]
pub fn get_original_event(original_event_hash: ActionHash) -> ExternResult<Option<Record>> {
    let Some(details) =     get_details(original_event_hash, GetOptions::default())? else {return Ok(None);};
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }?;

    Ok(Some(record))
}

#[hdk_extern]
pub fn get_latest_event(original_event_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(original_event_hash.clone(), LinkTypes::Updates, None)?;
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
pub fn get_all_event_revisions(original_event_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let Some(Details::Record(details)) =     get_details(original_event_hash, GetOptions::default())? else {return Ok(vec![]);};

    let mut records = vec![details.record];

    for update in details.updates {
        let mut update_records = get_all_event_revisions(update.action_address().clone())?;

        records.append(&mut update_records);
    }

    Ok(records)
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
        LinkTypes::Updates,
        (),
    )?;
    let record = get(updated_event_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly updated Event"))
    ))?;
    Ok(record)
}
