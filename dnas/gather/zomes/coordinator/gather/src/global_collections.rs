use gather_integrity::*;
use hdk::prelude::*;

/** Upcoming events */

pub fn all_upcoming_events() -> Path {
    Path::from("all_upcoming_events")
}
#[hdk_extern]
pub fn get_all_upcoming_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_upcoming_events())
}

#[hdk_extern]
pub fn mark_event_past(event_hash: ActionHash) -> ExternResult<()> {
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

/** Cancelled events */

pub fn all_cancelled_events() -> Path {
    Path::from("all_cancelled_events")
}
#[hdk_extern]
pub fn get_all_cancelled_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_cancelled_events())
}

/** Past events */

pub fn all_past_events() -> Path {
    Path::from("all_past_events")
}
#[hdk_extern]
pub fn get_all_past_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_past_events())
}

/** Open event proposals */
#[hdk_extern]
pub fn mark_event_proposal_expired(event_hash: ActionHash) -> ExternResult<()> {
    remove_from_collection(&event_hash, all_open_event_proposals())?;

    let path = all_expired_event_proposals();

    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;

    Ok(())
}

#[hdk_extern]
pub fn mark_event_proposal_fulfilled(event_hash: ActionHash) -> ExternResult<()> {
    remove_from_collection(&event_hash, all_open_event_proposals())?;

    let path = all_upcoming_events();

    create_link(
        path.path_entry_hash()?,
        event_hash.clone(),
        LinkTypes::AllEvents,
        (),
    )?;

    Ok(())
}

pub fn all_open_event_proposals() -> Path {
    Path::from("all_open_event_proposals")
}
#[hdk_extern]
pub fn get_all_open_event_proposals(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_open_event_proposals())
}

/** Expired event proposals */

pub fn all_expired_event_proposals() -> Path {
    Path::from("all_expired_events")
}
#[hdk_extern]
pub fn get_all_expired_event_proposals(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_expired_event_proposals())
}

/** Cancelled event proposals */

pub fn all_cancelled_event_proposals() -> Path {
    Path::from("all_cancelled_event_proposals")
}
#[hdk_extern]
pub fn get_all_cancelled_event_proposals(_: ()) -> ExternResult<Vec<ActionHash>> {
    get_from_path(all_cancelled_event_proposals())
}

/** Helpers */

fn get_from_path(path: Path) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(path.path_entry_hash()?, LinkTypes::AllEvents, None)?;
    let hashes: Vec<ActionHash> = links
        .into_iter()
        .filter_map(|link| link.target.into_action_hash())
        .collect();
    Ok(hashes)
}

pub fn remove_from_collection(hash: &ActionHash, path: Path) -> ExternResult<()> {
    let links = get_links(path.path_entry_hash()?, LinkTypes::AllEvents, None)?;

    for link in links {
        if let Some(action_hash) = link.target.into_action_hash() {
            if action_hash.eq(&hash) {
                delete_link(link.create_link_hash)?;
            }
        }
    }

    Ok(())
}
