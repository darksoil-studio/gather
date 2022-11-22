use hdk::prelude::*;
use gather_integrity::*;
#[hdk_extern]
pub fn create_attendees_attestation(
    attendees_attestation: AttendeesAttestation,
) -> ExternResult<Record> {
    let attendees_attestation_hash = create_entry(
        &EntryTypes::AttendeesAttestation(attendees_attestation.clone()),
    )?;
    for base in attendees_attestation.ateendees.clone() {
        create_link(
            base,
            attendees_attestation_hash.clone(),
            LinkTypes::AteendeeToAttendeesAttestations,
            (),
        )?;
    }
    create_link(
        attendees_attestation.event_hash.clone(),
        attendees_attestation_hash.clone(),
        LinkTypes::EventToAttendeesAttestations,
        (),
    )?;
    let record = get(attendees_attestation_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly created AttendeesAttestation"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_attendees_attestation(
    original_attendees_attestation_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    get_latest_attendees_attestation(original_attendees_attestation_hash)
}
fn get_latest_attendees_attestation(
    attendees_attestation_hash: ActionHash,
) -> ExternResult<Option<Record>> {
    let details = get_details(attendees_attestation_hash, GetOptions::default())?
        .ok_or(
            wasm_error!(WasmErrorInner::Guest("AttendeesAttestation not found".into())),
        )?;
    let record_details = match details {
        Details::Entry(_) => {
            Err(wasm_error!(WasmErrorInner::Guest("Malformed details".into())))
        }
        Details::Record(record_details) => Ok(record_details),
    }?;
    if record_details.deletes.len() > 0 {
        return Ok(None);
    }
    match record_details.updates.last() {
        Some(update) => get_latest_attendees_attestation(update.action_address().clone()),
        None => Ok(Some(record_details.record)),
    }
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateAttendeesAttestationInput {
    pub previous_attendees_attestation_hash: ActionHash,
    pub updated_attendees_attestation: AttendeesAttestation,
}
#[hdk_extern]
pub fn update_attendees_attestation(
    input: UpdateAttendeesAttestationInput,
) -> ExternResult<Record> {
    let updated_attendees_attestation_hash = update_entry(
        input.previous_attendees_attestation_hash,
        &input.updated_attendees_attestation,
    )?;
    let record = get(updated_attendees_attestation_hash.clone(), GetOptions::default())?
        .ok_or(
            wasm_error!(
                WasmErrorInner::Guest(String::from("Could not find the newly updated AttendeesAttestation"))
            ),
        )?;
    Ok(record)
}
#[hdk_extern]
pub fn get_attendees_attestations_for_ateendee(
    ateendee: AgentPubKey,
) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(ateendee, LinkTypes::AteendeeToAttendeesAttestations, None)?;
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
#[hdk_extern]
pub fn get_attendees_attestations_for_event(
    event_hash: ActionHash,
) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(event_hash, LinkTypes::EventToAttendeesAttestations, None)?;
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
