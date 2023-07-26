#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use hdk::prelude::*;
use holochain::test_utils::consistency_10s;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

mod common;
use common::{create_event, sample_event_1};

#[tokio::test(flavor = "multi_thread")]
async fn create_a_event_and_get_events_by_author() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join("../../../workdir/gather.dna");
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("gather", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("gather");
    let bob_zome = bobbo.zome("gather");

    let sample = sample_event_1(&conductors[0], &alice_zome).await;

    // Alice creates a Event
    let record: Record = create_event(&conductors[0], &alice_zome, sample.clone()).await;

    consistency_10s([&alice, &bobbo]).await;

    let get_records: Vec<Record> = conductors[1]
        .call(&bob_zome, "get_events_by_author", alice_zome.cell_id().agent_pubkey().clone())
        .await;

    assert_eq!(get_records.len(), 1);
    assert_eq!(get_records[0], record);
}


