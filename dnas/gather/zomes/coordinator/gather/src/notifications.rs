use std::fmt::Debug;

use gather_integrity::{Event, Proposal};
use hc_zome_trait_pending_notifications::*;
use hc_zome_traits::*;
use hdk::prelude::*;
use hrl::Hrl;
use serde::de::DeserializeOwned;
use xliff::t::T;

use crate::{event::get_latest_event, proposal::get_latest_proposal};

struct AlertsNotifications;

#[implement_zome_trait_as_externs]
impl PendingNotifications for AlertsNotifications {
    fn get_notification(input: GetNotificationInput) -> ExternResult<Option<Notification>> {
        let Some(alert_record) = get(input.notification_hash.clone(), GetOptions::default())? else {
            return Ok(None);
        };

        let Action::CreateLink(create_link) = alert_record.action().clone() else {
          return Err(wasm_error!(WasmErrorInner::Guest(format!("notification hash is not for a create link"))));
        };

        let bytes = SerializedBytes::from(UnsafeBytes::from(create_link.tag.into_inner()));
        let notification = GatherNotification::try_from(bytes).map_err(|err| wasm_error!(err))?;

        match notification {
            GatherNotification::EventAlert { event_hash, action } => {
                let latest_event = get_latest_event(event_hash.clone())?.ok_or(wasm_error!(
                    WasmErrorInner::Guest(format!("Failed to get latest event"))
                ))?;

                let event = Event::try_from(latest_event.entry().as_option().ok_or(
                    wasm_error!(WasmErrorInner::Guest(format!(
                        "Failed to get latest event: malformed record"
                    ))),
                )?)?;

                let body = get_body(action, input.locale)?;

                Ok(Some(Notification {
                    title: event.title,
                    body,
                    hrl_to_navigate_to_on_click: HrlWithContext {
                        hrl: Hrl {
                            dna_hash: dna_info()?.hash,
                            resource_hash: event_hash.into(),
                        },
                        context: SerializedBytes::from(UnsafeBytes::from(vec![])),
                    },
                    pending: true,
                }))
            }
            GatherNotification::ProposalAlert {
                proposal_hash,
                action,
            } => {
                let latest_proposal = get_latest_proposal(proposal_hash.clone())?.ok_or(
                    wasm_error!(WasmErrorInner::Guest(format!(
                        "Failed to get latest proposal: could not get proposal"
                    ))),
                )?;

                let proposal = Proposal::try_from(latest_proposal.entry().as_option().ok_or(
                    wasm_error!(WasmErrorInner::Guest(format!(
                        "Failed to get latest proposal: malformed record"
                    ))),
                )?)?;

                let body = get_body(action, input.locale)?;

                Ok(Some(Notification {
                    title: proposal.title,
                    body,
                    hrl_to_navigate_to_on_click: HrlWithContext {
                        hrl: Hrl {
                            dna_hash: dna_info()?.hash,
                            resource_hash: proposal_hash.into(),
                        },
                        context: SerializedBytes::from(UnsafeBytes::from(vec![])),
                    },
                    pending: true,
                }))
            }
        }
    }
}

fn t_from_xliff(xliff_str: &str, source: &str) -> String {
    let t = T::load_str(xliff_str);
    let unit = t.t_source(None, source);
    if let Some(unit) = unit {
        if let Some(t) = unit.target_text() {
            return t.clone();
        }
    }
    source.to_string()
}

fn t(locale: String, source: &str) -> String {
    match locale.as_str() {
        "sv" => t_from_xliff(include_str!("../../../../../../ui/xliff/sv.xlf"), source),
        "en" => source.to_string(),
        _ => source.to_string(),
    }
}

fn call_assemble<
    P: Serialize + DeserializeOwned + Debug,
    R: Serialize + DeserializeOwned + Debug,
>(
    function_name: FunctionName,
    payload: P,
) -> ExternResult<R> {
    let result = call(
        CallTargetCell::Local,
        ZomeName::from("assemble"),
        function_name,
        None,
        payload,
    )?;

    match result {
        ZomeCallResponse::Ok(r) => r.decode().map_err(|err| wasm_error!(err)),
        r => Err(wasm_error!(WasmErrorInner::Guest(format!(
            "Error calling assemble: {r:?}"
        )))),
    }
}

fn get_body(action: GatherAction, locale: String) -> ExternResult<String> {
    let t = match action {
        GatherAction::ProposalCreated { .. } => t(locale, "Proposal was created."),
        GatherAction::ProposalCancelled { .. } => t(locale, "Proposal was cancelled."),
        GatherAction::ProposalUncancelled { .. } => t(locale, "Proposal was uncancelled!"),
        GatherAction::ProposalExpired { .. } => t(
            locale,
            "Proposal expired without meeting the minimum required needs.",
        ),
        GatherAction::ProposalUpdated { .. } => t(locale, "Proposal was updated."),
        GatherAction::EventCreated { action_hash } => {
            let latest_event = get_latest_event(action_hash.clone())?.ok_or(wasm_error!(
                WasmErrorInner::Guest(format!("Failed to get latest event"))
            ))?;

            let event = Event::try_from(latest_event.entry().as_option().ok_or(wasm_error!(
                WasmErrorInner::Guest(format!("Failed to get latest event: malformed record"))
            ))?)?;
            match event.from_proposal {
                Some(_) => t(locale, "The proposal succeeded! It is now an event."),
                None => t(locale, "Event was created."),
            }
        }
        GatherAction::EventCancelled { .. } => t(locale, "Event was cancelled."),
        GatherAction::EventUncancelled { .. } => t(locale, "Event was uncancelled!"),
        GatherAction::EventUpdated { .. } => t(locale, "Event was updated."),
        // TODO: implement commitments notifications
        // GatherAction::CommitmentCreated{ action_hash } => {
        //     let maybe_commitment: Option<Record> = call_assemble("get_commitment".into(), action_hash.clone())?.ok_or(wasm_error!(
        //         WasmErrorInner::Guest(format!("Failed to get latest event"))
        //     ))?;

        //     let event = Event::try_from(latest_event.entry().as_option().ok_or(wasm_error!(
        //         WasmErrorInner::Guest(format!("Failed to get latest event: malformed record"))
        //     ))?)?;
        //     match event.from_proposal {
        //         Some(_) => t(locale, "The proposal succeeded! It is now an event."),
        //         None => t(locale, "Event was created."),
        //     }
        GatherAction::SatisfactionCreated { .. } => t(locale, "One of the needs was satisfied."),
        GatherAction::SatisfactionDeleted { .. } => {
            t(locale, "One of the needs is no longer satisfied.")
        }
        GatherAction::AssemblyCreated { .. } => t(locale, "All needs have been satisfied!"),
        _ => t(locale, ""),
    };

    Ok(t)
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes)]
#[serde(tag = "type")]
pub enum GatherNotification {
    EventAlert {
        event_hash: ActionHash,
        action: GatherAction,
    },
    ProposalAlert {
        proposal_hash: ActionHash,
        action: GatherAction,
    },
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes)]
#[serde(tag = "type")]
pub enum GatherAction {
    ProposalCreated {
        action_hash: ActionHash,
    },
    ProposalUpdated {
        action_hash: ActionHash,
    },
    ProposalCancelled {
        action_hash: ActionHash,
    },
    ProposalUncancelled {
        action_hash: ActionHash,
    },
    ProposalExpired {
        action_hash: ActionHash,
        timestamp: u64,
    },
    EventCreated {
        action_hash: ActionHash,
    },
    EventUpdated {
        action_hash: ActionHash,
    },
    EventCancelled {
        action_hash: ActionHash,
    },
    EventUncancelled {
        action_hash: ActionHash,
    },
    CommitmentCreated {
        action_hash: ActionHash,
    },
    CommitmentCancelled {
        action_hash: ActionHash,
    },
    CommitmentCancellationUndone {
        action_hash: ActionHash,
    },
    SatisfactionCreated {
        action_hash: ActionHash,
    },
    SatisfactionDeleted {
        action_hash: ActionHash,
    },
    AssemblyCreated {
        action_hash: ActionHash,
    },
}

#[implemented_zome_traits]
pub enum ZomeTraits {
    PendingNotifications(AlertsNotifications),
}
