use hdi::prelude::*;
#[hdk_entry_helper]
#[derive(Clone)]
pub struct Event {
    pub title: String,
    pub description: String,
    pub image: EntryHash,
    pub location: String,
    pub start_time: Timestamp,
    pub end_time: Timestamp,
    pub private: bool,
    pub cost: Option<String>,
}
