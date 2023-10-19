use gather_integrity::*;
use hdk::prelude::*;

use crate::global_collections::all_open_proposals;

#[hdk_extern]
pub fn create_proposal(proposal: Proposal) -> ExternResult<Record> {
    let proposal_hash = create_entry(&EntryTypes::Proposal(proposal.clone()))?;
    let record = get(proposal_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created Proposal"))
    ))?;

    let path = all_open_proposals();

    create_link(
        path.path_entry_hash()?,
        proposal_hash.clone(),
        LinkTypes::AllProposals,
        (),
    )?;

    let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(
        my_agent_pub_key,
        proposal_hash.clone(),
        LinkTypes::MyEvents,
        (),
    )?;
    Ok(record)
}

#[hdk_extern]
pub fn get_proposal(original_proposal_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(original_proposal_hash.clone(), LinkTypes::Updates, None)?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_proposal_hash = match latest_link {
        Some(link) => ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?,
        None => original_proposal_hash.clone(),
    };
    let Some(details) =     get_details(latest_proposal_hash, GetOptions::default())? else {return Ok(None);};
    let record = match details {
        Details::Record(details) => Ok(details.record),
        _ => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "Malformed get details response"
        )))),
    }?;

    Ok(Some(record))
}

#[hdk_extern]
pub fn get_all_proposal_revisions(original_proposal_hash: ActionHash) -> ExternResult<Vec<Record>> {
    let Some(Details::Record(details)) = get_details(original_proposal_hash, GetOptions::default())? else {
        return Ok(vec![]);
    };

    let mut records = vec![details.record];

    for update in details.updates {
        let mut update_records = get_all_proposal_revisions(update.action_address().clone())?;

        records.append(&mut update_records);
    }

    Ok(records)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateProposalInput {
    pub original_proposal_hash: ActionHash,
    pub previous_proposal_hash: ActionHash,
    pub updated_proposal: Proposal,
}
#[hdk_extern]
pub fn update_proposal(input: UpdateProposalInput) -> ExternResult<Record> {
    let updated_proposal_hash = update_entry(
        input.previous_proposal_hash.clone(),
        &input.updated_proposal,
    )?;
    create_link(
        input.original_proposal_hash.clone(),
        updated_proposal_hash.clone(),
        LinkTypes::Updates,
        (),
    )?;
    let record = get(updated_proposal_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly updated proposal"))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn get_events_for_proposal(proposal_hash: ActionHash) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(proposal_hash, LinkTypes::ProposalToEvent, None)?;
    let hashes: Vec<ActionHash> = links
        .into_iter()
        .filter_map(|link| link.target.into_action_hash())
        .collect();
    Ok(hashes)
}
