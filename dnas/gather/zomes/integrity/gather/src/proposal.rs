use hdi::prelude::*;

use crate::EventTime;

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Proposal {
    pub hosts: Vec<AgentPubKey>,
    pub title: String,
    pub description: String,
    pub image: EntryHash,
    pub location: Option<String>,
    pub time: Option<EventTime>,
    pub cost: Option<String>,
    pub call_to_action_hash: ActionHash,
}
