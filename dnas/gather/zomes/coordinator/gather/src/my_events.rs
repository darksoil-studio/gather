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
