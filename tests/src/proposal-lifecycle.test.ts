import { test, assert } from 'vitest';

import { pause, runScenario } from '@holochain/tryorama';
import { toPromise } from '@holochain-open-dev/stores';
import {
  readAndAssertNotification,
  sampleProposal,
  setup,
  waitAndDhtSync,
} from './utils';

test('proposal: create and cancel', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob } = await setup(scenario);

      let openProposals = await toPromise(alice.store.allOpenProposals);
      assert.equal(openProposals.length, 0);
      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 0);
      let cancelledProposals = await toPromise(
        alice.store.allCancelledProposals
      );
      assert.equal(cancelledProposals.length, 0);

      const proposal = await alice.store.client.createProposal(
        await sampleProposal(alice.store, {
          title: 'Cool Proposal',
          hosts: [bob.player.agentPubKey],
        })
      );
      assert.ok(proposal);

      await waitAndDhtSync([alice.player, bob.player]);

      await readAndAssertNotification(
        bob.store,
        'Cool Proposal',
        'Förslaget skapades.'
      );

      let bobProposals = await toPromise(bob.store.myOpenProposals);
      assert.equal(bobProposals.length, 0);

      let aliceProposals = await toPromise(alice.store.myOpenProposals);
      assert.equal(aliceProposals.length, 1);

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 1);

      await bob.store.client.addMyselfAsInterested(proposal.actionHash);

      await waitAndDhtSync([alice.player, bob.player]);

      await alice.store.cancellationsStore.client.createCancellation(
        proposal.actionHash,
        "Let's not do this finally"
      );

      await waitAndDhtSync([alice.player, bob.player]);

      await readAndAssertNotification(
        bob.store,
        'Cool Proposal',
        'Förslaget togs bort.'
      );

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 0);

      cancelledProposals = await toPromise(bob.store.allCancelledProposals);
      assert.equal(cancelledProposals.length, 1);

      let aliceCancelledProposals = await toPromise(
        alice.store.myCancelledProposals
      );
      assert.equal(aliceCancelledProposals.length, 1);
    },
    true,
    { timeout: 60_000 }
  );
});

test('proposal: create and expire', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob } = await setup(scenario);

      let openProposals = await toPromise(alice.store.allOpenProposals);
      assert.equal(openProposals.length, 0);
      let expiredProposals = await toPromise(alice.store.allExpiredProposals);
      assert.equal(expiredProposals.length, 0);

      const proposal = await alice.store.client.createProposal(
        await sampleProposal(
          alice.store,
          {
            title: 'Cool Proposal',
            hosts: [bob.player.agentPubKey],
          },
          (Date.now() + 30_000) * 1000
        )
      );
      assert.ok(proposal);
      await alice.store.client.addMyselfAsInterested(proposal.actionHash);

      await waitAndDhtSync([alice.player, bob.player]);

      await readAndAssertNotification(
        bob.store,
        'Cool Proposal',
        'Förslaget skapades.'
      );

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 1);

      await pause(30_000);

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 0);

      await waitAndDhtSync([alice.player, bob.player]);

      expiredProposals = await toPromise(bob.store.allExpiredProposals);
      assert.equal(expiredProposals.length, 1);

      await readAndAssertNotification(
        alice.store,
        'Cool Proposal',
        'Förslaget gick ut utan att nå upp till minimi nivåer för behov.'
      );
    },
    true,
    { timeout: 60000 }
  );
});

test('proposal: create and fulfill', async t => {
  await runScenario(
    async scenario => {
      const { alice, bob } = await setup(scenario);

      let openProposals = await toPromise(alice.store.allOpenProposals);
      assert.equal(openProposals.length, 0);
      let upcomingEvents = await toPromise(alice.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 0);
      let myEvents = await toPromise(alice.store.myEvents);
      assert.equal(myEvents.length, 0);
      let myOpenProposals = await toPromise(alice.store.myOpenProposals);
      assert.equal(myOpenProposals.length, 0);

      const proposal = await alice.store.client.createProposal(
        await sampleProposal(alice.store, {
          title: 'Cool Proposal',
          hosts: [bob.player.agentPubKey],
        })
      );
      assert.ok(proposal);

      await waitAndDhtSync([alice.player, bob.player]);

      await readAndAssertNotification(
        bob.store,
        'Cool Proposal',
        'Förslaget skapades.'
      );

      await bob.store.client.addMyselfAsInterested(proposal.actionHash);

      await waitAndDhtSync([alice.player, bob.player]);

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 1);
      myOpenProposals = await toPromise(alice.store.myOpenProposals);
      assert.equal(myOpenProposals.length, 1);

      // This should create the event automatically
      const assembly = await alice.store.assembleStore.client.createAssembly({
        call_to_action_hash: proposal.entry.call_to_action_hash,
        satisfactions_hashes: [],
      });

      await waitAndDhtSync([alice.player, bob.player]);

      await readAndAssertNotification(
        bob.store,
        'Cool Proposal',
        // 'Alla behov har blivit tillfredställda!'
        'Förslaget gick igenom! Det är nu ett event.'
      );

      myOpenProposals = await toPromise(alice.store.myOpenProposals);
      assert.equal(myOpenProposals.length, 0);
      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 0);
      upcomingEvents = await toPromise(bob.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);
      let aliceUpcomingEvents = await toPromise(alice.store.myUpcomingEvents);
      assert.equal(aliceUpcomingEvents.length, 1);
    },
    true,
    { timeout: 60_000 }
  );
});
