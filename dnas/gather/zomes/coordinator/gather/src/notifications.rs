use gather_integrity::{Event, Proposal};
use hc_zome_trait_pending_notifications::*;
use hc_zome_traits::*;
use hdk::prelude::*;
use hrl::Hrl;

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

        let (title, action, hrl_to_navigate_to_on_click) = match notification {
            GatherNotification::EventAlert { event_hash, action } => {
                let latest_event = match call(
                    CallTargetCell::Local,
                    ZomeName::from("gather"),
                    FunctionName::from("get_latest_event"),
                    None,
                    event_hash.clone(),
                )? {
                    ZomeCallResponse::Ok(p) => {
                        p.decode::<Option<Record>>().map_err(|err| wasm_error!(err))
                    }
                    r => Err(wasm_error!(WasmErrorInner::Guest(format!(
                        "Failed to get latest event: {r:?}"
                    )))),
                }?
                .ok_or(wasm_error!(WasmErrorInner::Guest(format!(
                    "Failed to get latest event"
                ))))?;

                let event = Event::try_from(latest_event.entry().as_option().ok_or(
                    wasm_error!(WasmErrorInner::Guest(format!(
                        "Failed to get latest event: malformed record"
                    ))),
                )?)?;

                (
                    event.title,
                    action,
                    HrlWithContext {
                        hrl: Hrl {
                            dna_hash: dna_info()?.hash,
                            resource_hash: event_hash.into(),
                        },
                        context: SerializedBytes::from(UnsafeBytes::from(vec![])),
                    },
                )
            }
            GatherNotification::ProposalAlert {
                proposal_hash,
                action,
            } => {
                let latest_proposal = match call(
                    CallTargetCell::Local,
                    ZomeName::from("gather"),
                    FunctionName::from("get_latest_proposal"),
                    None,
                    proposal_hash.clone(),
                )? {
                    ZomeCallResponse::Ok(p) => {
                        p.decode::<Option<Record>>().map_err(|err| wasm_error!(err))
                    }
                    r => Err(wasm_error!(WasmErrorInner::Guest(format!(
                        "Failed to get latest proposal: {r:?}"
                    )))),
                }?
                .ok_or(wasm_error!(WasmErrorInner::Guest(format!(
                    "Failed to get latest proposal: could not get proposal"
                ))))?;

                let proposal = Proposal::try_from(latest_proposal.entry().as_option().ok_or(
                    wasm_error!(WasmErrorInner::Guest(format!(
                        "Failed to get latest proposal: malformed record"
                    ))),
                )?)?;

                (
                    proposal.title,
                    action,
                    HrlWithContext {
                        hrl: Hrl {
                            dna_hash: dna_info()?.hash,
                            resource_hash: proposal_hash.into(),
                        },
                        context: SerializedBytes::from(UnsafeBytes::from(vec![])),
                    },
                )
            }
        };

        let body = get_body(action);

        Ok(Some(Notification {
            title,
            body,
            hrl_to_navigate_to_on_click,
            pending: true,
        }))
    }
}

fn get_body(action: GatherAction) -> String {
    // match action {
    //     ProposalCreated{ action_hash } =>
    // }
    String::from("hety")
}

#[derive(Serialize, Deserialize, Debug, SerializedBytes)]
#[serde(tag = "type", rename_all = "camelCase")]
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
#[serde(tag = "type", rename_all = "camelCase")]
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
        timestamp: u32,
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
