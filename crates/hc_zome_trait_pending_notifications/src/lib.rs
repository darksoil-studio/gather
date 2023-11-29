use hc_zome_traits::*;
use hdk::prelude::{holo_hash::DnaHash, *};

pub type Hrl = (DnaHash, AnyDhtHash);

#[derive(Serialize, Deserialize, Debug)]
pub struct HrlWithContext {
    hrl: Hrl,
    context: SerializedBytes,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PendingNotification {
    id: AnyDhtHash,
    title: String,
    body: String,
    hrl_to_navigate_to_on_click: HrlWithContext,
}

#[zome_trait]
pub trait PendingNotifications {
    fn get_pending_notifications(_: ()) -> ExternResult<Vec<PendingNotification>>;

    fn emit_new_pending_notification(
        pending_notification: PendingNotification,
    ) -> ExternResult<()> {
        emit_signal(pending_notification)?;

        Ok(())
    }
}
