import {
  ActionHash,
  AppAgentCallZomeRequest,
  AppAgentWebsocket,
} from '@holochain/client';
import { encode } from '@msgpack/msgpack';
import { Scenario } from '@holochain/tryorama';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { AssembleClient, AssembleStore } from '@darksoil/assemble';
import {
  CancellationsClient,
  CancellationsStore,
} from '@holochain-open-dev/cancellations';
import { sampleCallToAction } from '@darksoil/assemble/dist/mocks.js';

import { GatherClient } from '../../ui/src/gather/gather/gather-client.js';
import { Event, Proposal } from '../../ui/src/gather/gather/types.js';
import { GatherStore } from '../../ui/src/gather/gather/gather-store.js';
import { AlertsStore } from '../../ui/src/alerts/alerts-store.js';
import { AlertsClient } from '../../ui/src/alerts/alerts-client.js';

export async function sampleProposal(
  gatherStore: GatherStore,
  partialProposal: Partial<Proposal> = {},
  expiration_time: number = undefined
): Promise<Proposal> {
  return {
    hosts: [],
    title:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    image: Buffer.from(
      new Uint8Array([
        132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ])
    ),
    location:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    time: {
      type: 'Unique',
      start_time: Date.now() * 1000 + 60 * 60 * 1000 * 1000,
      end_time: Date.now() * 1000 + 2 * 60 * 60 * 1000 * 1000,
    },
    cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    call_to_action_hash: (
      await gatherStore.assembleStore.client.createCallToAction(
        await sampleCallToAction(gatherStore.assembleStore.client, {
          expiration_time,
        })
      )
    ).actionHash,
    ...partialProposal,
  };
}

export async function sampleEvent(
  gatherStore: GatherStore,
  partialEvent: Partial<Event> = {}
): Promise<Event> {
  return {
    hosts: [],
    title:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    image: Buffer.from(
      new Uint8Array([
        132, 33, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ])
    ),
    location:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    time: {
      type: 'Unique',
      start_time: Date.now() * 1000 + 60 * 60 * 1000 * 1000,
      end_time: Date.now() * 1000 + 2 * 60 * 60 * 1000 * 1000,
    },
    cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    call_to_action_hash: (
      await gatherStore.assembleStore.client.createCallToAction(
        await sampleCallToAction(gatherStore.assembleStore.client)
      )
    ).actionHash,
    from_proposal: undefined,
    ...partialEvent,
  };
}

export async function setup(scenario: Scenario) {
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

  // console.log(alice.appAgentWs);
  // installLogger(alice.appAgentWs as any);
  // installLogger(bob.appAgentWs as any);

  const aliceCancellations = new CancellationsStore(
    new CancellationsClient(alice.appAgentWs as any, 'gather', 'cancellations')
  );

  const aliceGather = new GatherStore(
    new GatherClient(alice.appAgentWs as any, 'gather', 'gather'),
    new AssembleStore(
      new AssembleClient(alice.appAgentWs as any, 'gather', 'assemble'),
      aliceCancellations
    ),
    new AlertsStore(
      new AlertsClient(alice.appAgentWs as any, 'gather', 'alerts')
    ),

    aliceCancellations
  );

  const bobCancellations = new CancellationsStore(
    new CancellationsClient(bob.appAgentWs as any, 'gather', 'cancellations')
  );
  const bobGather = new GatherStore(
    new GatherClient(bob.appAgentWs as any, 'gather', 'gather'),
    new AssembleStore(
      new AssembleClient(bob.appAgentWs as any, 'gather', 'assemble'),
      bobCancellations
    ),
    new AlertsStore(
      new AlertsClient(bob.appAgentWs as any, 'gather', 'alerts')
    ),
    bobCancellations
  );

  return {
    alice: {
      player: alice,
      store: aliceGather,
    },
    bob: {
      player: bob,
      store: bobGather,
    },
  };
}
