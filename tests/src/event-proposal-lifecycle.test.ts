import { test, assert } from 'vitest';

import { dhtSync, pause, runScenario, Scenario } from '@holochain/tryorama';
import { sampleCallToAction, sampleEvent, setup } from './utils';
import { toPromise } from '@holochain-open-dev/stores';

test('event proposal: create and cancel', async t => {
  await runScenario(
    async scenario => {
      const { aliceGather, bobGather, alice, bob } = await setup(scenario);

      let openEventProposals = await toPromise(
        aliceGather.allOpenEventsProposals
      );
      assert.equal(openEventProposals.length, 0);
      let cancelledEventProposals = await toPromise(
        aliceGather.allCancelledEventProposals
      );
      assert.equal(cancelledEventProposals.length, 0);

      const callToAction =
        await aliceGather.assembleStore.client.createCallToAction(
          sampleCallToAction()
        );

      const event = await aliceGather.client.createEventProposal(
        sampleEvent(callToAction.actionHash)
      );
      assert.ok(event);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      openEventProposals = await toPromise(bobGather.allOpenEventsProposals);
      assert.equal(openEventProposals.length, 1);

      await aliceGather.client.cancelEvent(event.actionHash);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      openEventProposals = await toPromise(bobGather.allOpenEventsProposals);
      assert.equal(openEventProposals.length, 0);

      cancelledEventProposals = await toPromise(
        bobGather.allCancelledEventProposals
      );
      assert.equal(cancelledEventProposals.length, 1);
    },
    true,
    { timeout: 30_000 }
  );
});

test('event proposal: create and expire', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob, aliceGather, bobGather } = await setup(scenario);

      let openEventProposals = await toPromise(
        aliceGather.allOpenEventsProposals
      );
      assert.equal(openEventProposals.length, 0);
      let expiredEventProposals = await toPromise(
        aliceGather.allExpiredEventProposals
      );
      assert.equal(expiredEventProposals.length, 0);

      const callToAction =
        await aliceGather.assembleStore.client.createCallToAction(
          sampleCallToAction({
            expiration_time: Date.now() * 1000 + 30_000_000, // 30 seconds from now
          })
        );

      const event = await aliceGather.client.createEventProposal(
        sampleEvent(callToAction.actionHash)
      );
      assert.ok(event);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      openEventProposals = await toPromise(bobGather.allOpenEventsProposals);
      assert.equal(openEventProposals.length, 1);

      await pause(30_000);

      openEventProposals = await toPromise(bobGather.allOpenEventsProposals);
      assert.equal(openEventProposals.length, 0);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      expiredEventProposals = await toPromise(
        bobGather.allExpiredEventProposals
      );
      assert.equal(expiredEventProposals.length, 1);
    },
    true,
    { timeout: 30000 }
  );
});

test('event proposal: create and fulfill', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob, aliceGather, bobGather } = await setup(scenario);

      let openEventProposals = await toPromise(
        aliceGather.allOpenEventsProposals
      );
      assert.equal(openEventProposals.length, 0);
      let upcomingEvents = await toPromise(aliceGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);

      const callToAction =
        await aliceGather.assembleStore.client.createCallToAction(
          sampleCallToAction()
        );

      const event = await aliceGather.client.createEventProposal(
        sampleEvent(callToAction.actionHash)
      );
      assert.ok(event);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      openEventProposals = await toPromise(bobGather.allOpenEventsProposals);
      assert.equal(openEventProposals.length, 1);

      await aliceGather.assembleStore.client.createAssembly({
        call_to_action_hash: callToAction.actionHash,
        satisfactions_hashes: [],
      });
      await aliceGather.client.markEventProposalFulfilled(event.actionHash);

      await dhtSync([alice, bob], alice.cells[0].cell_id[0]);

      openEventProposals = await toPromise(bobGather.allOpenEventsProposals);
      assert.equal(openEventProposals.length, 0);

      upcomingEvents = await toPromise(aliceGather.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);
    },
    true,
    { timeout: 30_000 }
  );
});
