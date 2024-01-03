use alerts_integrity::*;
use hc_zome_trait_pending_notifications::*;
use hc_zome_traits::*;
use hdk::prelude::*;

pub mod alerts;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}
#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Signal {
    LinkCreated {
        action: SignedActionHashed,
        link_type: LinkTypes,
    },
    LinkDeleted {
        action: SignedActionHashed,
        create_link_action: SignedActionHashed,
        link_type: LinkTypes,
    },
    // EntryCreated {
    //     action: SignedActionHashed,
    //     app_entry: EntryTypes,
    // },
    // EntryUpdated {
    //     action: SignedActionHashed,
    //     app_entry: EntryTypes,
    //     original_app_entry: EntryTypes,
    // },
    // EntryDeleted {
    //     action: SignedActionHashed,
    //     original_app_entry: EntryTypes,
    // },
}
#[hdk_extern(infallible)]
pub fn post_commit(committed_actions: Vec<SignedActionHashed>) {
    for action in committed_actions {
        if let Err(err) = signal_action(action) {
            error!("Error signaling new action: {:?}", err);
        }
    }
}
fn signal_action(action: SignedActionHashed) -> ExternResult<()> {
    match action.hashed.content.clone() {
        Action::CreateLink(create_link) => {
            if let Ok(Some(link_type)) =
                LinkTypes::from_type(create_link.zome_index, create_link.link_type)
            {
                emit_signal(Signal::LinkCreated { action, link_type })?;
            }
            Ok(())
        }
        Action::DeleteLink(delete_link) => {
            let record = get(delete_link.link_add_address.clone(), GetOptions::default())?.ok_or(
                wasm_error!(WasmErrorInner::Guest(
                    "Failed to fetch CreateLink action".to_string()
                )),
            )?;
            match record.action() {
                Action::CreateLink(create_link) => {
                    if let Ok(Some(link_type)) =
                        LinkTypes::from_type(create_link.zome_index, create_link.link_type)
                    {
                        emit_signal(Signal::LinkDeleted {
                            action,
                            link_type,
                            create_link_action: record.signed_action,
                        })?;
                    }
                    Ok(())
                }
                _ => {
                    return Err(wasm_error!(WasmErrorInner::Guest(
                        "Create Link should exist".to_string()
                    )));
                }
            }
        }
        _ => Ok(()),
    }
}

struct AlertsNotifications;

#[implement_zome_trait_as_externs]
impl PendingNotifications for AlertsNotifications {
    fn get_notification(input: GetNotificationInput) -> ExternResult<Option<Notification>> {
        let Some(alert_record) = get(input.notification_hash, GetOptions::default())? else {
            return Ok(None);
        };

        let Action::CreateLink(create_link) = alert_record.action().clone() else {
          return Err(wasm_error!(WasmErrorInner::Guest(format!("Notification hash is not for a create link"))));
        };

        Ok(Some(Notification {
            title: String::from("hey"),
            body: String::from("ho"),
            hrl_to_navigate_to_on_click: HrlWithContext {
                hrl: (dna_info()?.dna_hash, input.notification_hash),
                context: SerializedBytes::from(UnsafeBytes::from(vec![])),
            },
            pending: true,
        }))
    }
}

#[implemented_zome_traits]
pub enum ZomeTraits {
    PendingNotifications(AlertsNotifications),
}
