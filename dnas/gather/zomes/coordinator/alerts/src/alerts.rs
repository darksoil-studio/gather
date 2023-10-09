use alerts_integrity::*;
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

#[derive(Serialize, Deserialize, Debug)]
pub struct NotifyAlertInput {
    alert: SerializedBytes,
    agents: Vec<AgentPubKey>,
}

#[hdk_extern]
pub fn notify_alert(input: NotifyAlertInput) -> ExternResult<()> {
    for agent in input.agents {
        create_link(
            agent.clone(),
            agent,
            LinkTypes::MyAlerts,
            input.alert.bytes().clone(),
        )?;
    }

    Ok(())
}

#[hdk_extern]
pub fn mark_alerts_as_read(alerts_action_hashes: Vec<ActionHash>) -> ExternResult<()> {
    for link_hash in alerts_action_hashes {
        delete_link(link_hash)?;
    }

    Ok(())
}

#[hdk_extern]
pub fn get_read_alerts(_: ()) -> ExternResult<Vec<SignedActionHashed>> {
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
        .map(|(link, _)| link)
        .collect();

    Ok(links)
}
