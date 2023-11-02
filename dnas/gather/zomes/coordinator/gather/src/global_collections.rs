use gather_integrity::*;
use hdk::prelude::*;


pub fn all_upcoming_events() -> Path {
    Path::from("all_upcoming_events")
}
#[hdk_extern]
pub fn get_all_upcoming_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_upcoming_events(), LinkTypes::AllEvents)
}
#[hdk_extern]
pub fn mark_event_as_past(event_hash: ActionHash) -> ExternResult<()> {
    remove_from_collection(&event_hash, all_upcoming_events())?;
    let path = all_past_events();
    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;
    Ok(())
}
#[hdk_extern]
pub fn mark_event_as_cancelled(event_hash: ActionHash) -> ExternResult<()> {
    remove_from_collection(&event_hash, all_upcoming_events())?;
    let path = all_cancelled_events();
    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;
    Ok(())
}
#[hdk_extern]
pub fn mark_event_as_upcoming(event_hash: ActionHash) -> ExternResult<()> {
    // No reason why the event can go from past to upcoming,
    // Only remove from cancelled

    remove_from_collection(&event_hash, all_cancelled_events())?;
    let path = all_upcoming_events();
    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;
    Ok(())
}
pub fn all_cancelled_events() -> Path {
    Path::from("all_cancelled_events")
}
#[hdk_extern]
pub fn get_all_cancelled_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_cancelled_events(), LinkTypes::AllEvents)
}
pub fn all_past_events() -> Path {
    Path::from("all_past_events")
}
#[hdk_extern]
pub fn get_all_past_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_past_events(), LinkTypes::AllEvents)
}
#[hdk_extern]
pub fn mark_proposal_as_expired(proposal_hash: ActionHash) -> ExternResult<()> {
    remove_from_collection(&proposal_hash, all_open_proposals())?;
    let path = all_expired_proposals();
    create_link(
        path.path_entry_hash()?,
        proposal_hash.clone(),
        LinkTypes::AllProposals,
        (),
    )?;
    Ok(())
}
#[hdk_extern]
pub fn mark_proposal_as_cancelled(proposal_hash: ActionHash) -> ExternResult<()> {
    remove_from_collection(&proposal_hash, all_open_proposals())?;
    let path = all_cancelled_proposals();
    create_link(
        path.path_entry_hash()?,
        proposal_hash.clone(),
        LinkTypes::AllProposals,
        (),
    )?;
    Ok(())
}
pub fn all_open_proposals() -> Path {
    Path::from("all_open_proposals")
}
#[hdk_extern]
pub fn get_all_open_proposals(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_open_proposals(), LinkTypes::AllProposals)
}
pub fn all_expired_proposals() -> Path {
    Path::from("all_expired_events")
}
#[hdk_extern]
pub fn get_all_expired_proposals(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_expired_proposals(), LinkTypes::AllProposals)
}
pub fn all_cancelled_proposals() -> Path {
    Path::from("all_cancelled_proposals")
}
#[hdk_extern]
pub fn get_all_cancelled_proposals(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_cancelled_proposals(), LinkTypes::AllProposals)
}

/** Helpers */

fn get_from_path(path: Path, link_type: LinkTypes) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(path.path_entry_hash()?, link_type, None)?;
    let hashes: Vec<ActionHash> = links
        .into_iter()
        .filter_map(|link| link.target.into_action_hash())
        .collect::<HashSet<ActionHash>>().into_iter()
        .collect();
    Ok(hashes)
}

pub fn remove_from_collection(hash: &ActionHash, path: Path) -> ExternResult<()> {
    let links = get_links(
        path.path_entry_hash()?,
        vec![LinkTypes::AllEvents, LinkTypes::AllProposals],
        None,
    )?;
    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if action_hash.eq(&hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }
    Ok(())
}
