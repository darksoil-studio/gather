use hdk::prelude::*;
use gather_integrity::*;
#[hdk_extern]
pub fn get_events_by_author(author: AgentPubKey) -> ExternResult<Vec<Record>> {
    let links = get_links(author, LinkTypes::EventsByAuthor, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .filter_map(|link| link.target.into_any_dht_hash())
        .map(|hash| GetInput::new(hash,
            GetOptions::default(),
        ))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let records: Vec<Record> = records.into_iter().filter_map(|r| r).collect();
    Ok(records)
}
