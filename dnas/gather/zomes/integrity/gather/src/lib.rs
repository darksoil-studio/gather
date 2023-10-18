use hdi::prelude::*;

pub mod event;
pub use event::*;
pub mod proposal;
pub use proposal::*;

#[hdk_extern]
pub fn validate(_op: Op) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_defs]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    Event(Event),
    Proposal(Proposal),
}

#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    Updates,
    AllEvents,
    AllProposals,
    MyEvents,
    PossibleParticipants,
}
