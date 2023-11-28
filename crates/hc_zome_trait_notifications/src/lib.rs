use hdk::prelude::*;

#[derive(Serialize, Deserialize, Debug)]
pub struct PendingNotification {
    id: AnyDhtHash,
    title: String,
    body: String,
}

pub trait PendingNotifications {
    fn get_pending_notifications(_: ()) -> ExternResult<Vec<PendingNotification>>;

    fn emit_new_notification_signal() -> ExternResult<()>;
}
