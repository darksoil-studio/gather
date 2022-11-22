
import test from 'node:test';
import assert from 'node:assert';

import { runScenario, pause } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, DnaSource } from '@holochain/client';
import { decode } from '@msgpack/msgpack';


test('create attendees_attestation', { concurrency: 1 }, async t => {
  await runScenario(async scenario => {

    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testDnaPath = process.cwd() + '/' + "../dnas/gather/workdir/gather.dna";

    // Set up the array of DNAs to be installed, which only consists of the
    // test DNA referenced by path.
    const dnas: DnaSource[] = [{ path: testDnaPath }];

    // Add 2 players with the test DNA to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithHapps([dnas, dnas]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();


    const createInput = {
  ateendees: [Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))],
  event_hash: Buffer.from(new Uint8Array([132, 41, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
};

    // Alice creates a attendees_attestation
    const record: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "create_attendees_attestation",
      payload: createInput,
    });
    assert.ok(record);

  });
});


test('create and read attendees_attestation', { concurrency: 1 }, async t => {
  await runScenario(async scenario => {

    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testDnaPath = process.cwd() + '/' + "../dnas/gather/workdir/gather.dna";

    // Set up the array of DNAs to be installed, which only consists of the
    // test DNA referenced by path.
    const dnas: DnaSource[] = [{ path: testDnaPath }];

    // Add 2 players with the test DNA to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithHapps([dnas, dnas]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const createInput: any = {
  ateendees: [Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))],
  event_hash: Buffer.from(new Uint8Array([132, 41, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
};

    // Alice creates a attendees_attestation
    const record: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "create_attendees_attestation",
      payload: createInput,
    });
    assert.ok(record);
    
    // Wait for the created entry to be propagated to the other node.
    await pause(300);

    // Bob gets the created attendees_attestation
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "gather",
      fn_name: "get_attendees_attestation",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(createInput, decode((createReadOutput.entry as any).Present.entry) as any);
  });
});

test('create and update attendees_attestation', { concurrency: 1 }, async t => {
  await runScenario(async scenario => {

    // Construct proper paths for your app.
    // This assumes app bundle created by the `hc app pack` command.
    const testDnaPath = process.cwd() + '/' + "../dnas/gather/workdir/gather.dna";

    // Set up the array of DNAs to be installed, which only consists of the
    // test DNA referenced by path.
    const dnas: DnaSource[] = [{ path: testDnaPath }];

    // Add 2 players with the test DNA to the Scenario. The returned players
    // can be destructured.
    const [alice, bob] = await scenario.addPlayersWithHapps([dnas, dnas]);

    // Shortcut peer discovery through gossip and register all agents in every
    // conductor of the scenario.
    await scenario.shareAllAgents();

    const createInput = {
  ateendees: [Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))],
  event_hash: Buffer.from(new Uint8Array([132, 41, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
};

    // Alice creates a attendees_attestation
    const record: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "create_attendees_attestation",
      payload: createInput,
    });
    assert.ok(record);
        
    const originalActionHash = record.signed_action.hashed.hash;
 
    // Alice updates the attendees_attestation
    let contentUpdate: any = {
  ateendees: [Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))],
  event_hash: Buffer.from(new Uint8Array([132, 41, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
};
    let updateInput = { 
      previous_attendees_attestation_hash: originalActionHash,
      updated_attendees_attestation: contentUpdate,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "update_attendees_attestation",
      payload: updateInput,
    });
    assert.ok(updatedRecord);


    // Wait for the updated entry to be propagated to the other node.
    await pause(300);
        
    // Bob gets the updated attendees_attestation
    const readUpdatedOutput0: Record = await bob.cells[0].callZome({
      zome_name: "gather",
      fn_name: "get_attendees_attestation",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput0.entry as any).Present.entry) as any);


    // Alice updates the attendees_attestation again
    contentUpdate = {
  ateendees: [Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), Buffer.from(new Uint8Array([132, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))],
  event_hash: Buffer.from(new Uint8Array([132, 41, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
};
    updateInput = { 
      previous_attendees_attestation_hash: updatedRecord.signed_action.hashed.hash,
      updated_attendees_attestation: contentUpdate,
    };

    updatedRecord = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "update_attendees_attestation",
      payload: updateInput,
    });
    assert.ok(updatedRecord);


    // Wait for the updated entry to be propagated to the other node.
    await pause(300);
        
    // Bob gets the updated attendees_attestation
    const readUpdatedOutput1: Record = await bob.cells[0].callZome({
      zome_name: "gather",
      fn_name: "get_attendees_attestation",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput1.entry as any).Present.entry) as any);

  });
});
