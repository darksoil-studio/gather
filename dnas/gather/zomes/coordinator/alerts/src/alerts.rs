use alerts_integrity::*;
use hc_zome_notifications_types::*;
use hdk::prelude::*;

#[hdk_extern]
pub fn get_unread_alerts(_: ()) -> ExternResult<Vec<SignedActionHashed>> {
    let agent_pub_key = agent_info()?;
    let links_details = get_link_details(
        agent_pub_key.agent_initial_pubkey,
        LinkTypes::MyAlerts,
        None,
    )?;

    let links = links_details
        .into_inner()
        .into_iter()
        .filter(|link_detail| link_detail.1.len() == 0)
        .map(|(link, _)| link)
        .collect();

    Ok(links)
}

pub fn create_link_relaxed<T, E>(
    base_address: impl Into<AnyLinkableHash>,
    target_address: impl Into<AnyLinkableHash>,
    link_type: T,
    tag: impl Into<LinkTag>,
) -> ExternResult<ActionHash>
where
    ScopedLinkType: TryFrom<T, Error = E>,
    WasmError: From<E>,
{
    let ScopedLinkType {
        zome_index,
        zome_type: link_type,
    } = link_type.try_into()?;
    HDK.with(|h| {
        h.borrow().create_link(CreateLinkInput::new(
            base_address.into(),
            target_address.into(),
            zome_index,
            link_type,
            tag.into(),
            ChainTopOrdering::Relaxed,
        ))
    })
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NotifyAlertInput {
    alert: SerializedBytes,
    agents: Vec<AgentPubKey>,
}

#[hdk_extern]
pub fn notify_alert(input: NotifyAlertInput) -> ExternResult<()> {
    for agent in input.agents {
        create_link_relaxed(
            agent.clone(),
            agent.clone(),
            LinkTypes::MyAlerts,
            input.alert.bytes().clone(),
        )?;

        match call(
            CallTargetCell::OtherRole("notifications".into()),
            "notifications",
            "request_notify_agent".into(),
            None,
            NotifyAgentInput {
                agent,
                notification: input.alert.clone(),
            },
        ) {
            Ok(ZomeCallResponse::Ok(_)) => {}
            r => warn!("Failed to notify agent: {r:?}"),
        };
    }

    Ok(())
}

#[hdk_extern]
pub fn mark_alerts_as_read(alerts_action_hashes: Vec<ActionHash>) -> ExternResult<()> {
    for link_hash in alerts_action_hashes {
        HDK.with(|h| {
            h.borrow().delete_link(DeleteLinkInput::new(
                link_hash.into(),
                ChainTopOrdering::Relaxed,
            ))
        })?;
    }

    Ok(())
}

#[hdk_extern]
pub fn get_read_alerts(_: ()) -> ExternResult<Vec<(SignedActionHashed, Vec<SignedActionHashed>)>> {
    let agent_pub_key = agent_info()?;
    let links_details = get_link_details(
        agent_pub_key.agent_initial_pubkey,
        LinkTypes::MyAlerts,
        None,
    )?;

    let links = links_details
        .into_inner()
        .into_iter()
        .filter(|link_detail| link_detail.1.len() > 0)
        .collect();

    Ok(links)
}
