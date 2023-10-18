use gather_integrity::*;
use hdk::prelude::*;

use crate::my_events::remove_from_my_events;

#[hdk_extern]
pub fn add_myself_as_possible_participant(event_or_proposal_hash: ActionHash) -> ExternResult<()> {
    let my_pub_key = agent_info()?.agent_initial_pubkey;

    create_link(
        event_or_proposal_hash.clone(),
        my_pub_key.clone(),
        LinkTypes::PossibleParticipants,
        (),
    )?;

    create_link(
        my_pub_key,
        event_or_proposal_hash.clone(),
        LinkTypes::MyEvents,
        (),
    )?;

    Ok(())
}

#[hdk_extern]
pub fn remove_myself_as_a_possible_participant(
    event_or_proposal_hash: ActionHash,
) -> ExternResult<()> {
    let my_pub_key = agent_info()?.agent_initial_pubkey;

    let links = get_links(
        event_or_proposal_hash.clone(),
        LinkTypes::PossibleParticipants,
        None,
    )?;

    for link in links {
        if let Some(pubkey) = link.target.into_agent_pub_key() {
            if pubkey.eq(&my_pub_key) {
                delete_link(link.create_link_hash)?;
            }
        }
    }

    remove_from_my_events(event_or_proposal_hash)?;

    Ok(())
}

#[hdk_extern]
pub fn get_possible_participants(
    event_or_proposal_hash: ActionHash,
) -> ExternResult<Vec<AgentPubKey>> {
    let links = get_links(
        event_or_proposal_hash.clone(),
        LinkTypes::PossibleParticipants,
        None,
    )?;

    let agent_pub_keys = links
        .into_iter()
        .filter_map(|link| link.target.into_agent_pub_key())
        .collect();

    Ok(agent_pub_keys)
}
