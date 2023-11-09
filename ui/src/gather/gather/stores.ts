import {
  Action,
  ActionHash,
  AgentPubKey,
  CreateLink,
  DeleteLink,
  HoloHash,
  SignedActionHashed,
} from '@holochain/client';
import {
  ActionCommittedSignal,
  LinkTypeForSignal,
  ZomeClient,
  retype,
  HashType,
  getHashType,
  HoloHashMap,
} from '@holochain-open-dev/utils';
import {
  asyncReadable,
  AsyncReadable,
  uniquify,
} from '@holochain-open-dev/stores';

import isEqual from 'lodash-es/isEqual.js';

function uniquifyActions<T extends Action>(
  actions: Array<SignedActionHashed<T>>
): Array<SignedActionHashed<T>> {
  const map = new HoloHashMap<ActionHash, SignedActionHashed<T>>();
  for (const a of actions) {
    map.set(a.hashed.hash, a);
  }

  return Array.from(map.values());
}

/**
 * Keeps an up to date list of the links for the non-deleted links in this DHT
 * Makes requests only while it has some subscriber
 *
 * Will do so by calling the given every 4 seconds calling the given fetch function,
 * and listening to `LinkCreated` and `LinkDeleted` signals
 *
 * Useful for link types
 */
export function liveLinksStore<
  BASE extends HoloHash,
  S extends ActionCommittedSignal<any, any>
>(
  client: ZomeClient<S>,
  baseAddress: BASE,
  fetchTargets: () => Promise<Array<SignedActionHashed<CreateLink>>>,
  linkType: LinkTypeForSignal<S>
): AsyncReadable<Array<SignedActionHashed<CreateLink>>> {
  let innerBaseAddress = baseAddress;
  if (getHashType(innerBaseAddress) === HashType.AGENT) {
    innerBaseAddress = retype(innerBaseAddress, HashType.ENTRY) as BASE;
  }
  return asyncReadable(async set => {
    let links: SignedActionHashed<CreateLink>[];
    const fetch = async () => {
      const nlinks = await fetchTargets();
      if (!isEqual(nlinks, links)) {
        links = uniquifyActions(nlinks);
        set(links);
      }
    };
    await fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal(signal => {
      if (signal.type === 'LinkCreated') {
        if (
          linkType in signal.link_type &&
          signal.action.hashed.content.base_address.toString() ===
            innerBaseAddress.toString()
        ) {
          links = uniquifyActions([...links, signal.action]);
          set(links);
        }
      } else if (signal.type === 'LinkDeleted') {
        if (
          linkType in signal.link_type &&
          signal.create_link_action.hashed.content.base_address.toString() ===
            innerBaseAddress.toString()
        ) {
          links = uniquifyActions(
            links.filter(
              h =>
                h.hashed.hash.toString() !==
                signal.create_link_action.hashed.hash.toString()
            )
          );
          set(links);
        }
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}

/**
 * Keeps an up to date list of the targets for the deleted links in this DHT
 * Makes requests only while it has some subscriber
 *
 * Will do so by calling the given every 4 seconds calling the given fetch function,
 * and listening to `LinkDeleted` signals
 *
 * Useful for link types and collections with some form of archive retrieving functionality
 */
export function deletedLinksStore<
  BASE extends HoloHash,
  S extends ActionCommittedSignal<any, any>
>(
  client: ZomeClient<S>,
  baseAddress: BASE,
  fetchDeletedTargets: () => Promise<
    Array<
      [SignedActionHashed<CreateLink>, Array<SignedActionHashed<DeleteLink>>]
    >
  >,
  linkType: LinkTypeForSignal<S>
): AsyncReadable<
  Array<[SignedActionHashed<CreateLink>, Array<SignedActionHashed<DeleteLink>>]>
> {
  let innerBaseAddress = baseAddress;
  if (getHashType(innerBaseAddress) === HashType.AGENT) {
    innerBaseAddress = retype(innerBaseAddress, HashType.ENTRY) as BASE;
  }
  return asyncReadable(async set => {
    let deletedTargets: Array<
      [SignedActionHashed<CreateLink>, Array<SignedActionHashed<DeleteLink>>]
    >;
    const fetch = async () => {
      const ndeletedTargets = await fetchDeletedTargets();
      if (!isEqual(deletedTargets, ndeletedTargets)) {
        deletedTargets = ndeletedTargets;
        set(deletedTargets);
      }
    };
    await fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal(signal => {
      if (signal.type === 'LinkDeleted') {
        if (
          linkType in signal.link_type &&
          signal.create_link_action.hashed.content.base_address.toString() ===
            innerBaseAddress.toString()
        ) {
          const alreadyDeletedTargetIndex = deletedTargets.findIndex(
            ([cl]) =>
              cl.hashed.hash.toString() ===
              signal.create_link_action.hashed.hash.toString()
          );

          if (alreadyDeletedTargetIndex !== -1) {
            deletedTargets[alreadyDeletedTargetIndex][1].push(signal.action);
          } else {
            deletedTargets = [
              ...deletedTargets,
              [signal.create_link_action, [signal.action]],
            ];
          }
          set(deletedTargets);
        }
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}

export function liveLinksAgentPubKeysTargetsStore<
  BASE extends HoloHash,
  S extends ActionCommittedSignal<any, any>
>(
  client: ZomeClient<S>,
  baseAddress: BASE,
  fetchTargets: () => Promise<AgentPubKey[]>,
  linkType: LinkTypeForSignal<S>
): AsyncReadable<Array<AgentPubKey>> {
  return asyncReadable<AgentPubKey[]>(async set => {
    let hashes: AgentPubKey[];
    const fetch = async () => {
      const nhashes = await fetchTargets();
      if (!isEqual(nhashes, hashes)) {
        hashes = uniquify(nhashes);
        set(hashes);
      }
    };
    await fetch();
    const interval = setInterval(() => fetch(), 4000);
    const unsubs = client.onSignal(signal => {
      if (signal.type === 'LinkCreated') {
        if (
          linkType in signal.link_type &&
          signal.action.hashed.content.base_address.toString() ===
            baseAddress.toString()
        ) {
          hashes = uniquify([
            ...hashes,
            retype(
              signal.action.hashed.content.target_address as AgentPubKey,
              HashType.AGENT
            ),
          ]);
          set(hashes);
        }
      } else if (signal.type === 'LinkDeleted') {
        if (
          linkType in signal.link_type &&
          signal.create_link_action.hashed.content.base_address.toString() ===
            baseAddress.toString()
        ) {
          hashes = uniquify(
            hashes.filter(
              h =>
                h.toString() !==
                retype(
                  signal.create_link_action.hashed.content.target_address,
                  HashType.AGENT
                ).toString()
            )
          );
          set(hashes);
        }
      }
    });
    return () => {
      clearInterval(interval);
      unsubs();
    };
  });
}
