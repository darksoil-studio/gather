import {
  AssembleClient,
  AssembleStore,
  Assembly,
  CallToAction,
} from '@darksoil/assemble';
import {
  asyncDeriveAndJoin,
  asyncDerived,
  AsyncReadable,
  completed,
  lazyLoadAndPoll,
  mapAndJoin,
  pipe,
  retryUntilSuccess,
  sliceAndJoin,
} from '@holochain-open-dev/stores';
import {
  EntryRecord,
  HoloHashMap,
  LazyHoloHashMap,
  pickBy,
} from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { decode } from '@msgpack/msgpack';

import { Event } from './types.js';
import { GatherClient } from './gather-client';

export class GatherStore {
  public assembleStore!: AssembleStore;

  constructor(public client: GatherClient) {
    this.assembleStore = new AssembleStore(
      new AssembleClient(client.client, 'gather')
    );
  }

  /** Event */

  events = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(async () => this.client.getEvent(eventHash), 4000)
  );

  eventsByCallToAction = new LazyHoloHashMap((callToActionHash: ActionHash) =>
    retryUntilSuccess(
      () => this.client.getEventForCallToAction(callToActionHash),
      1000
    )
  );

  /** Attendees for Event */

  attendeesForEvent = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(
      async () => this.client.getAttendeesForEvent(eventHash),
      4000
    )
  );

  eventsForAttendee = new LazyHoloHashMap((agent: AgentPubKey) =>
    lazyLoadAndPoll(async () => this.client.getEventsForAttendee(agent), 4000)
  );

  /** All events */

  allEvents = pipe(
    this.assembleStore.allAssemblies,
    allAssemblies => sliceAndJoin(this.assembleStore.assemblies, allAssemblies),
    (allAssemblies: ReadonlyMap<ActionHash, EntryRecord<Assembly>>) =>
      mapAndJoin(allAssemblies, assembly =>
        this.eventsByCallToAction.get(assembly.entry.call_to_action_hash)
      ),
    eventsHashes =>
      sliceAndJoin(this.events, Array.from(eventsHashes.values())),
    events => {
      const allEvents: HoloHashMap<
        ActionHash,
        EntryRecord<Event>
      > = new HoloHashMap();
      for (const [eventHash, event] of Array.from(events.entries())) {
        if (event) {
          if (event.entry.start_time < Date.now() * 1000) {
            this.assembleStore.client.closeCallToAction(
              event.entry.call_to_action_hash
            );
          } else {
            allEvents.set(eventHash, event);
          }
        }
      }

      const sorted = Array.from(events.entries())
        .sort(
          ([h1, event1], [h2, event2]) =>
            event1.entry.start_time - event2.entry.start_time
        )
        .map(([h, _]) => h);

      return completed(sorted);
    }
  );

  allEventsProposals = pipe(
    this.assembleStore.openCallsToAction,
    callsToAction => sliceAndJoin(this.eventsByCallToAction, callsToAction),
    eventsHashes =>
      sliceAndJoin(this.events, Array.from(eventsHashes.values())),
    events => {
      const allEvents: HoloHashMap<
        ActionHash,
        EntryRecord<Event>
      > = new HoloHashMap();
      for (const [eventHash, event] of Array.from(events.entries())) {
        if (event) {
          if (event.entry.start_time < Date.now() * 1000) {
            this.assembleStore.client.closeCallToAction(
              event.entry.call_to_action_hash
            );
          } else {
            allEvents.set(eventHash, event);
          }
        }
      }

      const sorted = Array.from(events.entries())
        .sort(
          ([h1, event1], [h2, event2]) =>
            event1.entry.start_time - event2.entry.start_time
        )
        .map(([h, _]) => h);

      return completed(sorted);
    }
  );

  myEvents = this.assembleStore.myCallsToAction as AsyncReadable<ActionHash[]>;

  eventsByAuthor = new LazyHoloHashMap((author: AgentPubKey) =>
    lazyLoadAndPoll(async () => {
      const records = await this.client.getEventsByAuthor(author);
      return records.map(r => r.actionHash);
    }, 4000)
  );
}
