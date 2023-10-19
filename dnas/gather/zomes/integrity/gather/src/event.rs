use std::time::Duration;

use hdi::prelude::*;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum EventTime {
    Periodic {
        start_time: Timestamp,
        event_duration: Duration,
        period_duration: Duration,
        ocurrences: Option<u64>,
    },
    Unique {
        start_time: Timestamp,
        end_time: Timestamp,
    },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FromProposal {
    pub proposal_hash: ActionHash,
    pub assembly_hash: ActionHash,
}

#[hdk_entry_helper]
#[derive(Clone)]
pub struct Event {
    pub hosts: Vec<AgentPubKey>,
    pub title: String,
    pub description: String,
    pub image: EntryHash,
    pub location: String,
    pub time: EventTime,
    pub cost: Option<String>,
    pub call_to_action_hash: ActionHash,
    pub from_proposal: Option<FromProposal>,
}

pub fn validate_create_link_events_by_author(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _event: crate::Event = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}
pub fn validate_delete_link_events_by_author(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "EventsByAuthor links cannot be deleted",
    )))
}
