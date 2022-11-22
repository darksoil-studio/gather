use hdk::prelude::*;
use gather_integrity::*;
#[derive(Serialize, Deserialize, Debug)]
pub struct AddAttendeeForEventInput {
    event_hash: ActionHash,
    attendee: AgentPubKey,
}
#[hdk_extern]
pub fn add_attendee_for_event(input: AddAttendeeForEventInput) -> ExternResult<()> {
    create_link(
        input.event_hash.clone(),
        input.attendee.clone(),
        LinkTypes::EventToAttendees,
        (),
    )?;
    create_link(input.attendee, input.event_hash, LinkTypes::AttendeeToEvents, ())?;
    Ok(())
}
#[hdk_extern]
pub fn get_attendees_for_event(event_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>> {
    let links = get_links(event_hash, LinkTypes::EventToAttendees, None)?;
    let agents: Vec<AgentPubKey> = links
        .into_iter()
        .map(|link| AgentPubKey::from(EntryHash::from(link.target)))
        .collect();
    Ok(agents)
}
#[hdk_extern]
pub fn get_events_for_attendee(attendee: AgentPubKey) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(attendee, LinkTypes::AttendeeToEvents, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .map(|link| GetInput::new(
            ActionHash::from(link.target).into(),
            GetOptions::default(),
        ))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let hashes: Vec<ActionHash> = records
        .into_iter()
        .filter_map(|r| r)
        .map(|r| r.action_address().clone())
        .collect();
    Ok(hashes)
}
#[derive(Serialize, Deserialize, Debug)]
pub struct RemoveAttendeeForEventInput {
    event_hash: ActionHash,
    attendee: AgentPubKey,
}
#[hdk_extern]
pub fn remove_attendee_for_event(input: RemoveAttendeeForEventInput) -> ExternResult<()> {
    let links = get_links(input.event_hash.clone(), LinkTypes::EventToAttendees, None)?;
    for link in links {
        if AgentPubKey::from(EntryHash::from(link.target.clone())).eq(&input.attendee) {
            delete_link(link.create_link_hash)?;
        }
    }
    let links = get_links(input.attendee.clone(), LinkTypes::AttendeeToEvents, None)?;
    for link in links {
        if ActionHash::from(link.target.clone()).eq(&input.event_hash) {
            delete_link(link.create_link_hash)?;
        }
    }
    Ok(())
}
