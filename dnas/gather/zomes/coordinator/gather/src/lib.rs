pub mod all_events;
pub mod attendees_attestation;
pub mod event_to_attendees;
pub mod event;
use hdk::prelude::*;
#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}
