import { ActionHash } from '@holochain/client';
import { encode } from '@msgpack/msgpack';
import { CallToAction, Assembly } from '@darksoil/assemble';
import { Scenario } from '@holochain/tryorama';
import { encodeHashToBase64, Record } from '@holochain/client';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { AssembleClient } from '@darksoil/assemble/dist/assemble-client.js';
import { AssembleStore } from '@darksoil/assemble/dist/assemble-store.js';
import { GatherClient } from '../../ui/src/gather-client.js';
import { Event } from '../../ui/src/types.js';
import { GatherStore } from '../../ui/src/gather-store.js';

export function sampleCallToAction(
  partialCallToAction: Partial<CallToAction> = {}
): CallToAction {
  return {
    custom_content: encode({}),
    expiration_time: undefined,
    needs: [],
    parent_call_to_action_hash: undefined,
    ...partialCallToAction,
  };
}

export function sampleEvent(
  callToActionHash: ActionHash,
  partialEvent: Partial<Event> = {}
): Event {
  return {
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
    start_time: Date.now() * 1000 + 60 * 60 * 1000 * 1000,
    end_time: Date.now() * 1000 + 2 * 60 * 60 * 1000 * 1000,
    cost: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec eros quis enim hendrerit aliquet.',
    call_to_action_hash: callToActionHash,
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

  const aliceAssemble = new AssembleStore(
    new AssembleClient(alice.appAgentWs as any, 'gather', 'assemble')
  );
  const aliceGather = new GatherStore(
    new GatherClient(alice.appAgentWs as any, 'gather', 'gather'),
    aliceAssemble
  );

  const bobAssemble = new AssembleStore(
    new AssembleClient(bob.appAgentWs as any, 'gather', 'assemble')
  );
  const bobGather = new GatherStore(
    new GatherClient(bob.appAgentWs as any, 'gather', 'gather'),
    bobAssemble
  );

  return {
    alice,
    bob,
    aliceGather,
    bobGather,
  };
}
