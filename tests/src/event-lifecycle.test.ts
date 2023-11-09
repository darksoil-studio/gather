import { test, assert } from 'vitest';

import { dhtSync, pause, runScenario } from '@holochain/tryorama';
import { toPromise } from '@holochain-open-dev/stores';

import { sampleEvent, setup } from './utils';

test('event: create and cancel', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob } = await setup(scenario);

      let upcomingEvents = await toPromise(alice.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);
      let cancelledEvents = await toPromise(alice.store.allCancelledEvents);
      assert.equal(cancelledEvents.length, 0);

      const event = await alice.store.client.createEvent(
        await sampleEvent(alice.store)
      );
      assert.ok(event);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);

      await alice.store.cancellationsStore.client.createCancellation(
        event.actionHash,
        "I can't make it"
      );

      await pause(400);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);

      cancelledEvents = await toPromise(bob.store.allCancelledEvents);
      assert.equal(cancelledEvents.length, 1);
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
        })
      );
      assert.ok(event);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);

      await pause(30_000);

      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      pastEvents = await toPromise(bob.store.allPastEvents);
      assert.equal(pastEvents.length, 1);
    },
    true,
    { timeout: 60000 }
  );
});
