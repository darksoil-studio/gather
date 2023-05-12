pub mod attendees_attestation;
pub use attendees_attestation::*;
pub mod event;
pub use event::*;
use hdi::prelude::*;
#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Event(Event),
    AttendeesAttestation(AttendeesAttestation),
}
#[hdk_link_types]
pub enum LinkTypes {
    EventUpdates,
    EventToCallToAction,
    EventToAttendees,
    AttendeeToEvents,
    AteendeeToAttendeesAttestations,
    EventToAttendeesAttestations,
    AllEvents,
    EventsByAuthor,
    EventProposalToEvent,
}
