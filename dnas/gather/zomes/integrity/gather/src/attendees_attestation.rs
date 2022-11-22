use hdi::prelude::*;
#[hdk_entry_helper]
#[derive(Clone)]
pub struct AttendeesAttestation {
    pub ateendees: Vec<AgentPubKey>,
    pub event_hash: ActionHash,
}
