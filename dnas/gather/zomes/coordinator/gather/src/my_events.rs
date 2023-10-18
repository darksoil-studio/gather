use gather_integrity::*;
use hdk::prelude::*;
#[hdk_extern]
pub fn get_my_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    let agent_pub_key = agent_info()?;
    let links = get_links(
        agent_pub_key.agent_initial_pubkey,
        LinkTypes::MyEvents,
        None,
    )?;
    let action_hashes = links
        .into_iter()
        .filter_map(|link| link.target.into_action_hash())
        .collect();
    Ok(action_hashes)
}

#[hdk_extern]
pub fn add_to_my_events(event_or_proposal_hash: ActionHash) -> ExternResult<()> {
    let my_pub_key = agent_info()?.agent_initial_pubkey;
    create_link(
        my_pub_key,
        event_or_proposal_hash.clone(),
        LinkTypes::MyEvents,
        (),
    )?;

    Ok(())
}

#[hdk_extern]
pub fn remove_from_my_events(event_or_proposal_hash: ActionHash) -> ExternResult<()> {
    let my_pub_key = agent_info()?.agent_initial_pubkey;
    let links = get_links(my_pub_key, LinkTypes::MyEvents, None)?;

    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if action_hash.eq(&event_or_proposal_hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }

    Ok(())
}
