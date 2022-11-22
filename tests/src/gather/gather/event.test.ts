
import test from 'node:test';
import assert from 'node:assert';

import { runScenario, pause } from '@holochain/tryorama';
import { NewEntryAction, ActionHash, Record, DnaSource } from '@holochain/client';
import { decode } from '@msgpack/msgpack';


test('create event', { concurrency: 1 }, async t => {
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
  title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  image: Buffer.from(new Uint8Array([132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
  location: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  start_time: 1665499212508,
  end_time: 1665499212508,
  private: true,
  cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.'
};

    // Alice creates a event
    const record: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "create_event",
      payload: createInput,
    });
    assert.ok(record);

  });
});


test('create and read event', { concurrency: 1 }, async t => {
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
  title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  image: Buffer.from(new Uint8Array([132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
  location: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  start_time: 1665499212508,
  end_time: 1665499212508,
  private: true,
  cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.'
};

    // Alice creates a event
    const record: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "create_event",
      payload: createInput,
    });
    assert.ok(record);
    
    // Wait for the created entry to be propagated to the other node.
    await pause(300);

    // Bob gets the created event
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "gather",
      fn_name: "get_event",
      payload: record.signed_action.hashed.hash,
    });
    assert.deepEqual(createInput, decode((createReadOutput.entry as any).Present.entry) as any);
  });
});

test('create and update event', { concurrency: 1 }, async t => {
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
  title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  image: Buffer.from(new Uint8Array([132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
  location: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  start_time: 1665499212508,
  end_time: 1665499212508,
  private: true,
  cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.'
};

    // Alice creates a event
    const record: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "create_event",
      payload: createInput,
    });
    assert.ok(record);
        
    const originalActionHash = record.signed_action.hashed.hash;
 
    // Alice updates the event
    let contentUpdate: any = {
  title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  image: Buffer.from(new Uint8Array([132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
  location: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  start_time: 1665499212508,
  end_time: 1665499212508,
  private: true,
  cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.'
};
    let updateInput = { 
      original_event_hash: originalActionHash,
      previous_event_hash: originalActionHash,
      updated_event: contentUpdate,
    };

    let updatedRecord: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "update_event",
      payload: updateInput,
    });
    assert.ok(updatedRecord);


    // Wait for the updated entry to be propagated to the other node.
    await pause(300);
        
    // Bob gets the updated event
    const readUpdatedOutput0: Record = await bob.cells[0].callZome({
      zome_name: "gather",
      fn_name: "get_event",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput0.entry as any).Present.entry) as any);


    // Alice updates the event again
    contentUpdate = {
  title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  image: Buffer.from(new Uint8Array([132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
  location: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  start_time: 1665499212508,
  end_time: 1665499212508,
  private: true,
  cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.'
};
    updateInput = { 
      original_event_hash: originalActionHash,
      previous_event_hash: updatedRecord.signed_action.hashed.hash,
      updated_event: contentUpdate,
    };

    updatedRecord = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "update_event",
      payload: updateInput,
    });
    assert.ok(updatedRecord);


    // Wait for the updated entry to be propagated to the other node.
    await pause(300);
        
    // Bob gets the updated event
    const readUpdatedOutput1: Record = await bob.cells[0].callZome({
      zome_name: "gather",
      fn_name: "get_event",
      payload: updatedRecord.signed_action.hashed.hash,
    });
    assert.deepEqual(contentUpdate, decode((readUpdatedOutput1.entry as any).Present.entry) as any);

  });
});

test('create and delete event', { concurrency: 1 }, async t => {
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
  title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  image: Buffer.from(new Uint8Array([132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])),
  location: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
  start_time: 1665499212508,
  end_time: 1665499212508,
  private: true,
  cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.'
};

    // Alice creates a event
    const record: Record = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "create_event",
      payload: createInput,
    });
    assert.ok(record);
        
    // Alice deletes the event
    const deleteActionHash = await alice.cells[0].callZome({
      zome_name: "gather",
      fn_name: "delete_event",
      payload: record.signed_action.hashed.hash,
    });
    assert.ok(deleteActionHash);


    // Wait for the entry deletion to be propagated to the other node.
    await pause(300);
        
    // Bob tries to get the deleted event
    const readDeletedOutput = await bob.cells[0].callZome({
      zome_name: "gather",
      fn_name: "get_event",
      payload: record.signed_action.hashed.hash,
    });
    assert.equal(readDeletedOutput, undefined);

  });
});
