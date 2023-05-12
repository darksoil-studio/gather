use gather_integrity::*;
use hdk::prelude::*;
#[hdk_extern]
pub fn create_event(event: Event) -> ExternResult<Record> {
    let event_hash = create_entry(&EntryTypes::Event(event.clone()))?;
    let record = get(event_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created Event"))
    ))?;
    create_link(
        event.call_to_action_hash,
        event_hash.clone(),
        LinkTypes::EventToCallToAction,
        (),
    )?;
    let my_agent_pub_key = agent_info()?.agent_latest_pubkey;
    create_link(
        my_agent_pub_key,
        event_hash.clone(),
        LinkTypes::EventsByAuthor,
        (),
    )?;
    Ok(record)
}

#[hdk_extern]
pub fn get_event(original_event_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(original_event_hash.clone(), LinkTypes::EventUpdates, None)?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_event_hash = match latest_link {
        Some(link) => ActionHash::from(link.target.clone()),
        None => original_event_hash.clone(),
    };
    get(latest_event_hash, GetOptions::default())
}

#[hdk_extern]
pub fn get_event_for_call_to_action(call_to_action_hash: ActionHash) -> ExternResult<ActionHash> {
    let links = get_links(
        call_to_action_hash.clone(),
        LinkTypes::EventToCallToAction,
        None,
    )?;

    match links.first() {
        Some(l) => Ok(ActionHash::from(l.target.clone())),
        None => Err(wasm_error!(WasmErrorInner::Guest(String::from(
            "No links found for this event"
        )))),
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateEventInput {
    pub original_event_hash: ActionHash,
    pub previous_event_hash: ActionHash,
    pub updated_event: Event,
}
#[hdk_extern]
pub fn update_event(input: UpdateEventInput) -> ExternResult<Record> {
    let updated_event_hash = update_entry(input.previous_event_hash.clone(), &input.updated_event)?;
    create_link(
        input.original_event_hash.clone(),
        updated_event_hash.clone(),
        LinkTypes::EventUpdates,
        (),
    )?;
    let record = get(updated_event_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly updated Event"))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn delete_event(original_event_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_event_hash)
}
