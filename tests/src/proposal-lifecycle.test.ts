import { test, assert } from 'vitest';

import { dhtSync, pause, runScenario } from '@holochain/tryorama';
import { toPromise } from '@holochain-open-dev/stores';
import { sampleProposal, setup } from './utils';

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
        await sampleProposal(alice.store)
      );
      assert.ok(proposal);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      let bobProposals = await toPromise(bob.store.myOpenProposals);
      assert.equal(bobProposals.length, 0);

      let aliceProposals = await toPromise(alice.store.myOpenProposals);
      assert.equal(aliceProposals.length, 1);

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 1);

      await alice.store.cancellationsStore.client.createCancellation(
        proposal.actionHash,
        "Let's not do this finally"
      );

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 0);

      cancelledProposals = await toPromise(bob.store.allCancelledProposals);
      assert.equal(cancelledProposals.length, 1);
    },
    true,
    { timeout: 30_000 }
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
        await sampleProposal(alice.store)
      );
      assert.ok(proposal);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 1);

      await pause(30_000);

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 0);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      expiredProposals = await toPromise(bob.store.allExpiredProposals);
      assert.equal(expiredProposals.length, 1);
    },
    true,
    { timeout: 30000 }
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

      const proposal = await alice.store.client.createProposal(
        await sampleProposal(alice.store)
      );
      assert.ok(proposal);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 1);
      myEvents = await toPromise(alice.store.myEvents);
      assert.equal(myEvents.length, 0);

      const assembly = await alice.store.assembleStore.client.createAssembly({
        call_to_action_hash: proposal.entry.call_to_action_hash,
        satisfactions_hashes: [],
      });

      const event = await alice.store.client.createEvent({
        fromProposal: {
          proposal_hash: proposal.actionHash,
          assembly_hash: assembly.actionHash,
        },
        ...(proposal.entry as any),
      });
      await alice.store.client.markProposalAsFulfilled(proposal.actionHash);

      await dhtSync(
        [alice.player, bob.player],
        alice.player.cells[0].cell_id[0]
      );

      openProposals = await toPromise(bob.store.allOpenProposals);
      assert.equal(openProposals.length, 0);

      upcomingEvents = await toPromise(alice.store.allUpcomingEvents);
      assert.equal(upcomingEvents.length, 1);
    },
    true,
    { timeout: 30_000 }
  );
});
