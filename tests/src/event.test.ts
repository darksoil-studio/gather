import { test, assert } from 'vitest';

import { runScenario, pause, dhtSync } from '@holochain/tryorama';
import { Record, SignedActionHashed } from '@holochain/client';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { decodeEntry } from '@holochain-open-dev/utils';
import { sampleCallToAction, sampleEvent } from './utils';
import { Event } from '../../ui/src/types.js';

test('create event', async t => {
  await runScenario(
    async scenario => {
      const testHappUrl =
        dirname(fileURLToPath(import.meta.url)) + '/../../workdir/gather.happ';

      // Add 2 players with the test hApp to the Scenario. The returned players
      // can be destructured.
      const [alice, bob] = await scenario.addPlayersWithApps([
        { appBundleSource: { path: testHappUrl } },
        { appBundleSource: { path: testHappUrl } },
      ]);

      // Shortcut peer discovery through gossip and register all agents in every
      // conductor of the scenario.
      await scenario.shareAllAgents();

      // Alice creates a event
      const callToActionRecord: Record = await alice.cells[0].callZome({
        zome_name: 'assemble',
        fn_name: 'create_call_to_action',
        payload: sampleCallToAction(),
      });
      // Alice creates a event
      const record: Record = await alice.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'create_event',
        payload: sampleEvent(callToActionRecord.signed_action.hashed.hash),
      });
      assert.ok(record);
    },
    true,
    { timeout: 30000 }
  );
});

test('create and read event', async t => {
  await runScenario(
    async scenario => {
      const testHappUrl =
        dirname(fileURLToPath(import.meta.url)) + '/../../workdir/gather.happ';

      // Add 2 players with the test hApp to the Scenario. The returned players
      // can be destructured.
      const [alice, bob] = await scenario.addPlayersWithApps([
        { appBundleSource: { path: testHappUrl } },
        { appBundleSource: { path: testHappUrl } },
      ]);

      // Shortcut peer discovery through gossip and register all agents in every
      // conductor of the scenario.
      await scenario.shareAllAgents();

      // Alice creates a event
      const callToActionRecord: Record = await alice.cells[0].callZome({
        zome_name: 'assemble',
        fn_name: 'create_call_to_action',
        payload: sampleCallToAction(),
      });
      const event = sampleEvent(callToActionRecord.signed_action.hashed.hash);
      // Alice creates a event
      const record: Record = await alice.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'create_event',
        payload: event,
      });
      assert.ok(record);

      // Wait for the created entry to be propagated to the other node.
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob gets the created event
      const createReadOutput: Record = await bob.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'get_event',
        payload: record.signed_action.hashed.hash,
      });
      assert.deepEqual(event, decodeEntry(createReadOutput));
    },
    true,
    { timeout: 30000 }
  );
});

test('create and update event', async t => {
  await runScenario(
    async scenario => {
      const testHappUrl =
        dirname(fileURLToPath(import.meta.url)) + '/../../workdir/gather.happ';

      // Add 2 players with the test hApp to the Scenario. The returned players
      // can be destructured.
      const [alice, bob] = await scenario.addPlayersWithApps([
        { appBundleSource: { path: testHappUrl } },
        { appBundleSource: { path: testHappUrl } },
      ]);

      // Shortcut peer discovery through gossip and register all agents in every
      // conductor of the scenario.
      await scenario.shareAllAgents();

      // Alice creates a event
      const callToActionRecord: Record = await alice.cells[0].callZome({
        zome_name: 'assemble',
        fn_name: 'create_call_to_action',
        payload: sampleCallToAction(),
      });
      const event = sampleEvent(callToActionRecord.signed_action.hashed.hash);
      // Alice creates a event
      const record: Record = await alice.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'create_event',
        payload: event,
      });
      assert.ok(record);

      const originalActionHash = record.signed_action.hashed.hash;

      // Alice updates the event
      let contentUpdate: Event = {
        call_to_action_hash: event.call_to_action_hash,
        title:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
        image: Buffer.from(
          new Uint8Array([
            132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          ])
        ),
        location:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
        start_time: 1665499212508,
        end_time: 1665499212508,
        cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
      };
      let updateInput = {
        original_event_hash: originalActionHash,
        previous_event_hash: originalActionHash,
        updated_event: contentUpdate,
      };

      let updatedRecord: Record = await alice.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'update_event',
        payload: updateInput,
      });
      assert.ok(updatedRecord);

      // Wait for the updated entry to be propagated to the other node.
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob gets the updated event
      const readUpdatedOutput0: Record = await bob.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'get_event',
        payload: updatedRecord.signed_action.hashed.hash,
      });
      assert.deepEqual(contentUpdate, decodeEntry(readUpdatedOutput0));

      // Alice updates the event again
      contentUpdate = {
        call_to_action_hash: event.call_to_action_hash,
        title:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
        image: Buffer.from(
          new Uint8Array([
            132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          ])
        ),
        location:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
        start_time: 1665499212508,
        end_time: 1665499212508,
        cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
      };
      updateInput = {
        original_event_hash: originalActionHash,
        previous_event_hash: updatedRecord.signed_action.hashed.hash,
        updated_event: contentUpdate,
      };

      updatedRecord = await alice.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'update_event',
        payload: updateInput,
      });
      assert.ok(updatedRecord);

      // Wait for the updated entry to be propagated to the other node.
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob gets the updated event
      const readUpdatedOutput1: Record = await bob.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'get_event',
        payload: updatedRecord.signed_action.hashed.hash,
      });
      assert.deepEqual(contentUpdate, decodeEntry(readUpdatedOutput1));
    },
    true,
    { timeout: 30000 }
  );
});

test('create and delete event', async t => {
  await runScenario(
    async scenario => {
      const testHappUrl =
        dirname(fileURLToPath(import.meta.url)) + '/../../workdir/gather.happ';

      // Add 2 players with the test hApp to the Scenario. The returned players
      // can be destructured.
      const [alice, bob] = await scenario.addPlayersWithApps([
        { appBundleSource: { path: testHappUrl } },
        { appBundleSource: { path: testHappUrl } },
      ]);

      // Shortcut peer discovery through gossip and register all agents in every
      // conductor of the scenario.
      await scenario.shareAllAgents();

      // Alice creates a event
      const callToActionRecord: Record = await alice.cells[0].callZome({
        zome_name: 'assemble',
        fn_name: 'create_call_to_action',
        payload: sampleCallToAction(),
      });
      const event = sampleEvent(callToActionRecord.signed_action.hashed.hash);
      // Alice creates a event
      const record: Record = await alice.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'create_event',
        payload: event,
      });
      assert.ok(record);

      // Alice deletes the event
      await alice.cells[0].callZome({
        zome_name: 'gather',
        fn_name: 'cancel_event',
        payload: record.signed_action.hashed.hash,
      });

      // Wait for the entry deletion to be propagated to the other node.
      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      // Bob tries to get the deleted event
      const cancellations: Array<SignedActionHashed> =
        await bob.cells[0].callZome({
          zome_name: 'gather',
          fn_name: 'get_event_cancellations',
          payload: record.signed_action.hashed.hash,
        });
      assert.equal(cancellations.length, 1);
    },
    true,
    { timeout: 30000 }
  );
});
