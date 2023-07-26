use hdk::prelude::*;
use gather_integrity::*;
#[hdk_extern]
pub fn get_all_events(_: ()) -> ExternResult<Vec<ActionHash>> {
    let path = Path::from("all_events");
    let links = get_links(path.path_entry_hash()?, LinkTypes::AllEvents, None)?;
    let get_input: Vec<GetInput> = links
        .into_iter()
        .filter_map(|link| ActionHash::try_from(link.target).ok())
        .map(|action_hash| GetInput::new(
            action_hash.into(),
            GetOptions::default(),
        ))
        .collect();
    let records = HDK.with(|hdk| hdk.borrow().get(get_input))?;
    let hashes: Vec<ActionHash> = records
        .into_iter()
        .filter_map(|r| r)
        .map(|r| r.action_address().clone())
        .collect();
    Ok(hashes)
}
