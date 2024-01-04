import { test, assert } from 'vitest';

import { dhtSync, pause, runScenario } from '@holochain/tryorama';
import { toPromise } from '@holochain-open-dev/stores';

import {
  readAndAssertNotification,
  sampleEvent,
  setup,
  waitAndDhtSync,
} from './utils';

test('event: create and cancel', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob } = await setup(scenario);

      let upcomingEvents = await toPromise(alice.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);
      let cancelledEvents = await toPromise(alice.store.allCancelledEvents);
      assert.equal(cancelledEvents.length, 0);

      const event = await alice.store.client.createEvent(
        await sampleEvent(alice.store, {
          title: 'Cool Event',
          hosts: [bob.player.agentPubKey],
        })
      );
      assert.ok(event);

      await waitAndDhtSync([alice.player, bob.player]);

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);

      await readAndAssertNotification(
        bob.store,
        'Cool Event',
        'Eventet har skapats.'
      );

      await bob.store.client.addMyselfAsInterested(event.actionHash);

      await waitAndDhtSync([alice.player, bob.player]);

      await alice.store.cancellationsStore.client.createCancellation(
        event.actionHash,
        "I can't make it"
      );

      await waitAndDhtSync([alice.player, bob.player]);

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);

      cancelledEvents = await toPromise(bob.store.allCancelledEvents);
      assert.equal(cancelledEvents.length, 1);

      await readAndAssertNotification(
        bob.store,
        'Cool Event',
        'Eventet ställdes.'
      );
    },
    true,
    { timeout: 60_000 }
  );
});

test('event: create and pass', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob } = await setup(scenario);

      let upcomingEvents = await toPromise(alice.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);
      let pastEvents = await toPromise(alice.store.allPastEvents);
      assert.equal(pastEvents.length, 0);

      const event = await alice.store.client.createEvent(
        await sampleEvent(alice.store, {
          time: {
            type: 'Unique',
            start_time: (Date.now() + 25_000) * 1000,
            end_time: (Date.now() + 60_000) * 1000,
          },
          title: 'Cool Event',
          hosts: [bob.player.agentPubKey],
        })
      );
      assert.ok(event);

      await waitAndDhtSync([alice.player, bob.player]);

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);

      await pause(30_000);

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);

      await waitAndDhtSync([alice.player, bob.player]);

      pastEvents = await toPromise(bob.store.allPastEvents);
      assert.equal(pastEvents.length, 1);
    },
    true,
    { timeout: 60000 }
  );
});
