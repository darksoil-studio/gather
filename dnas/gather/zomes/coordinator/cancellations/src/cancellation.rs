use hdk::prelude::*;

#[hdk_extern]
pub fn create_cancellation(cancellation: Cancellation) -> ExternResult<Record> {
    let cancellation_hash = create_entry(&EntryTypes::Cancellation(cancellation.clone()))?;
    create_link(
        cancellation.event_hash.clone(),
        cancellation_hash.clone(),
        LinkTypes::Cancellations,
        (),
    )?;
    let record = get(cancellation_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from(
            "Could not find the newly created Cancellation"
        ))
    ))?;

    Ok(record)
}

#[hdk_extern]
pub fn get_cancellation(original_cancellation_hash: ActionHash) -> ExternResult<Option<Record>> {
    get_latest_cancellation(original_cancellation_hash)
}
fn get_latest_cancellation(cancellation_hash: ActionHash) -> ExternResult<Option<Record>> {
    let details = get_details(cancellation_hash, GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Cancellation not found".into())
    ))?;
    let record_details = match details {
        Details::Entry(_) => Err(wasm_error!(WasmErrorInner::Guest(
            "Malformed details".into()
        ))),
        Details::Record(record_details) => Ok(record_details),
    }?;
    if record_details.deletes.len() > 0 {
        return Ok(None);
    }
    match record_details.updates.last() {
        Some(update) => get_latest_cancellation(update.action_address().clone()),
        None => Ok(Some(record_details.record)),
    }
}
#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateCancellationInput {
    pub previous_cancellation_hash: ActionHash,
    pub updated_cancellation: Cancellation,
}
#[hdk_extern]
pub fn update_cancellation(input: UpdateCancellationInput) -> ExternResult<Record> {
    let updated_cancellation_hash = update_entry(
        input.previous_cancellation_hash,
        &input.updated_cancellation,
    )?;
    let record = get(updated_cancellation_hash.clone(), GetOptions::default())?.ok_or(
        wasm_error!(WasmErrorInner::Guest(String::from(
            "Could not find the newly updated Cancellation"
        ))),
    )?;
    Ok(record)
}
#[hdk_extern]
pub fn delete_cancellation(original_cancellation_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_cancellation_hash)
}
#[hdk_extern]
pub fn get_cancellations_for(action_hash: ActionHash) -> ExternResult<Vec<ActionHash>> {
    let links = get_links(action_hash, LinkTypes::Cancellations, None)?;
    let action_hashes: Vec<ActionHash> = links
        .into_iter()
        .filter_map(|link| link.target.into_action_hash())
        .collect();
    Ok(action_hashes)
}
