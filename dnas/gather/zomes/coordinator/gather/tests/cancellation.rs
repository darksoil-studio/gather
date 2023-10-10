#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use hdk::prelude::*;
use holochain::test_utils::consistency_10s;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

use gather_integrity::*;

use gather::cancellation::UpdateCancellationInput;

mod common;
use common::{create_cancellation, sample_cancellation_1, sample_cancellation_2};

use common::{create_event, sample_event_1, sample_event_2};

#[tokio::test(flavor = "multi_thread")]
async fn create_cancellation_test() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join("../../../workdir/gather.dna");
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("gather", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (_bobbo,)) = apps.into_tuples();
    
    let alice_zome = alice.zome("gather");
    
    let sample = sample_cancellation_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Cancellation
    let record: Record = create_cancellation(&conductors[0], &alice_zome, sample.clone()).await;
    let entry: Cancellation = record.entry().to_app_option().unwrap().unwrap();
    assert!(entry.eq(&sample));
}


#[tokio::test(flavor = "multi_thread")]
async fn create_and_read_cancellation() {
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
    
    let sample = sample_cancellation_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Cancellation
    let record: Record = create_cancellation(&conductors[0], &alice_zome, sample.clone()).await;
    
    consistency_10s([&alice, &bobbo]).await;
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_cancellation", record.signed_action.action_address().clone())
        .await;
        
    assert_eq!(record, get_record.unwrap());    
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_update_cancellation() {
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
    
    let sample_1 = sample_cancellation_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Cancellation
    let record: Record = create_cancellation(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash.clone();
        
    consistency_10s([&alice, &bobbo]).await;
    
    let sample_2 = sample_cancellation_2(&conductors[0], &alice_zome).await;
    let input = UpdateCancellationInput {
      previous_cancellation_hash: original_action_hash.clone(),
      updated_cancellation: sample_2.clone(),
    };
    
    // Alice updates the Cancellation
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_cancellation", input)
        .await;
        
    let entry: Cancellation = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_2, entry);
    
    consistency_10s([&alice, &bobbo]).await;
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_cancellation", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
    
    let input = UpdateCancellationInput {
      previous_cancellation_hash: update_record.signed_action.hashed.hash.clone(),
      updated_cancellation: sample_1.clone(),
    };
    
    // Alice updates the Cancellation again
    let update_record: Record = conductors[0]
        .call(&alice_zome, "update_cancellation", input)
        .await;
        
    let entry: Cancellation = update_record.entry().to_app_option().unwrap().unwrap();
    assert_eq!(sample_1, entry);
    
    consistency_10s([&alice, &bobbo]).await;
    
    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_cancellation", original_action_hash.clone())
        .await;
  
    assert_eq!(update_record, get_record.unwrap());
}

#[tokio::test(flavor = "multi_thread")]
async fn create_and_delete_cancellation() {
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
    
    let sample_1 = sample_cancellation_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Cancellation
    let record: Record = create_cancellation(&conductors[0], &alice_zome, sample_1.clone()).await;
    let original_action_hash = record.signed_action.hashed.hash;
    
    // Alice deletes the Cancellation
    let _delete_action_hash: ActionHash = conductors[0]
        .call(&alice_zome, "delete_cancellation", original_action_hash.clone())
        .await;

    consistency_10s([&alice, &bobbo]).await;

    let get_record: Option<Record> = conductors[1]
        .call(&bob_zome, "get_cancellation", original_action_hash.clone())
        .await;
        
    assert!(get_record.is_none());
}
