import { test, assert } from 'vitest';

import { dhtSync, pause, runScenario, Scenario } from '@holochain/tryorama';
import { sampleCallToAction, sampleEvent, setup } from './utils';
import { toPromise } from '@holochain-open-dev/stores';

test('event: create and cancel', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob, aliceGather, bobGather } = await setup(scenario);

      let upcomingEvents = await toPromise(aliceGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);
      let cancelledEvents = await toPromise(aliceGather.allCancelledEvents);
      assert.equal(cancelledEvents.length, 0);

      const callToAction =
        await aliceGather.assembleStore.client.createCallToAction(
          sampleCallToAction()
        );

      const assembly = await aliceGather.assembleStore.client.createAssembly({
        call_to_action_hash: callToAction.actionHash,
        satisfactions_hashes: [],
      });

      const event = await aliceGather.client.createEvent(
        sampleEvent(callToAction.actionHash)
      );
      assert.ok(event);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      upcomingEvents = await toPromise(bobGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);

      await aliceGather.client.cancelEvent(event.actionHash);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      upcomingEvents = await toPromise(bobGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);

      cancelledEvents = await toPromise(bobGather.allCancelledEvents);
      assert.equal(cancelledEvents.length, 1);
    },
    true,
    { timeout: 30000 }
  );
});

test('event: create and pass', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob, aliceGather, bobGather } = await setup(scenario);

      let upcomingEvents = await toPromise(aliceGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);
      let pastEvents = await toPromise(aliceGather.allPastEvents);
      assert.equal(pastEvents.length, 0);

      const callToAction =
        await aliceGather.assembleStore.client.createCallToAction(
          sampleCallToAction()
        );

      await aliceGather.assembleStore.client.createAssembly({
        call_to_action_hash: callToAction.actionHash,
        satisfactions_hashes: [],
      });

      const event = await aliceGather.client.createEvent(
        sampleEvent(callToAction.actionHash, {
          start_time: Date.now() * 1000 + 1_000_000 * 15,
          end_time: Date.now() * 1000 + 1_000_000 * 60,
        })
      );
      assert.ok(event);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      upcomingEvents = await toPromise(bobGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);

      await pause(15000);

      upcomingEvents = await toPromise(bobGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      pastEvents = await toPromise(bobGather.allPastEvents);
      assert.equal(pastEvents.length, 1);
    },
    true,
    { timeout: 30000 }
  );
});
