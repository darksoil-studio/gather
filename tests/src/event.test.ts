import { test, assert } from 'vitest';

import { runScenario, dhtSync } from '@holochain/tryorama';
import { cleanNodeDecoding } from '@holochain-open-dev/utils/dist/clean-node-decoding.js';
import { toPromise } from '@holochain-open-dev/stores';
import { sampleEvent, setup } from './utils.js';
import { Event } from '../../ui/src/gather/gather/types.js';

test('create and update event', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob } = await setup(scenario);

      // Alice creates a event
      const event = await alice.store.client.createEvent(
        await sampleEvent(alice.store)
      );
      assert.ok(event);

      const originalActionHash = event.actionHash;

      // Alice updates the event
      let contentUpdate: Event = {
        from_proposal: undefined,
        hosts: event.entry.hosts,
        call_to_action_hash: event.entry.call_to_action_hash,
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
        time: {
          type: 'Unique',
          start_time: 1665499212508,
          end_time: 1665499212508,
        },
        cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
      };

      let updatedEvent = await alice.store.client.updateEvent(
        originalActionHash,
        originalActionHash,
        contentUpdate
      );
      assert.ok(updatedEvent);

      // Wait for the updated entry to be propagated to the other node.
      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      // Bob gets the updated event
      const readUpdatedOutput0 = await toPromise(
        bob.store.events.get(originalActionHash)
      );
      assert.deepEqual(
        contentUpdate,
        cleanNodeDecoding(readUpdatedOutput0.entry)
      );

      // Alice updates the event again
      contentUpdate = {
        call_to_action_hash: event.entry.call_to_action_hash,
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
        time: {
          type: 'Unique',
          start_time: 1665499212508,
          end_time: 1665499212508,
        },
        cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
        from_proposal: undefined,
        hosts: event.entry.hosts,
      };

      updatedEvent = await alice.store.client.updateEvent(
        originalActionHash,
        updatedEvent.signed_action.hashed.hash,
        contentUpdate
      );
      assert.ok(updatedEvent);

      // Wait for the updated entry to be propagated to the other node.
      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      // Bob gets the updated event
      const readUpdatedOutput1 = await toPromise(
        bob.store.events.get(originalActionHash)
      );
      assert.deepEqual(
        contentUpdate,
        cleanNodeDecoding(readUpdatedOutput1.entry)
      );
    },
    true,
    { timeout: 30000 }
  );
});
