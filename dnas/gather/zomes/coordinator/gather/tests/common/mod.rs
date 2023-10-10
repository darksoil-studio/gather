

pub async fn sample_cancellation_1(conductor: &SweetConductor, zome: &SweetZome) -> Cancellation {
    Cancellation {
	  reason: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
    }
}

pub async fn sample_cancellation_2(conductor: &SweetConductor, zome: &SweetZome) -> Cancellation {
    Cancellation {
	  reason: "Lorem ipsum 2".to_string(),
    }
}

pub async fn create_cancellation(conductor: &SweetConductor, zome: &SweetZome, cancellation: Cancellation) -> Record {
    let record: Record = conductor
        .call(zome, "create_cancellation", cancellation)
        .await;
    record
}



pub async fn sample_cancellation_1(conductor: &SweetConductor, zome: &SweetZome) -> Cancellation {
    Cancellation {
	  reason: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
          event_hash: create_event(conductor, zome, sample_event_1(conductor, zome).await).await.signed_action.hashed.hash,
    }
}

pub async fn sample_cancellation_2(conductor: &SweetConductor, zome: &SweetZome) -> Cancellation {
    Cancellation {
	  reason: "Lorem ipsum 2".to_string(),
          event_hash: create_event(conductor, zome, sample_event_2(conductor, zome).await).await.signed_action.hashed.hash,
    }
}

pub async fn create_cancellation(conductor: &SweetConductor, zome: &SweetZome, cancellation: Cancellation) -> Record {
    let record: Record = conductor
        .call(zome, "create_cancellation", cancellation)
        .await;
    record
}

