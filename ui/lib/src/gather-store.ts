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
  join,
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
} from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey } from '@holochain/client';

import { Event } from './types.js';
import { GatherClient } from './gather-client';
import { isExpired, isPast } from './utils.js';

export class GatherStore {
  constructor(
    public client: GatherClient,
    public assembleStore: AssembleStore
  ) {}

  /** Event */

  events = new LazyHoloHashMap((eventHash: ActionHash) =>
    asyncDerived(
      lazyLoadAndPoll(async () => this.client.getEvent(eventHash), 4000),
      event =>
        event
          ? { record: event.event, isCancelled: event.deletes.length > 0 }
          : undefined
    )
  );

  eventsByCallToAction = new LazyHoloHashMap((callToActionHash: ActionHash) =>
    retryUntilSuccess(
      () => this.client.getEventForCallToAction(callToActionHash),
      1000
    )
  );

  /** Participants for Event */

  participantsForEvent = new LazyHoloHashMap((eventHash: ActionHash) =>
    pipe(this.events.get(eventHash), event =>
      !event
        ? completed([])
        : pipe(
            this.assembleStore.commitmentsForCallToAction.get(
              event.record.entry.call_to_action_hash
            ),
            commitments =>
              completed(
                commitments
                  .filter(c => c.entry.need_index === 0)
                  .map(c => c.action.author)
              )
          )
    )
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
          if (!event.isCancelled) {
            allEvents.set(eventHash, event.record);
          }
        }
      }
      return completed(allEvents);
    }
  );

  allFutureEvents = asyncDerived(this.allEvents, allEvents => {
    const sorted = Array.from(allEvents.entries())
      .filter(([h, event]) => !isPast(event.entry))
      .sort(
        ([h1, event1], [h2, event2]) =>
          event1.entry.start_time - event2.entry.start_time
      )
      .map(([h, _]) => h);
    return sorted;
  });

  allEventsProposals = pipe(
    this.assembleStore.openCallsToAction,
    callsToAction =>
      sliceAndJoin(this.eventsByCallToAction, Array.from(callsToAction.keys())),
    eventsHashes =>
      sliceAndJoin(this.events, Array.from(eventsHashes.values())),
    events => {
      const allEvents: HoloHashMap<
        ActionHash,
        EntryRecord<Event>
      > = new HoloHashMap();

      for (const [eventHash, event] of Array.from(events.entries())) {
        if (event) {
          if (event.isCancelled || isPast(event.record.entry)) {
            this.assembleStore.client.closeCallToAction(
              event.record.entry.call_to_action_hash
            );
          } else {
            allEvents.set(eventHash, event.record);
          }
        }
      }

      const sorted = Array.from(events.entries())
        .sort(
          ([h1, event1], [h2, event2]) =>
            event1.record.entry.start_time - event2.record.entry.start_time
        )
        .map(([h, _]) => h);

      return completed(sorted);
    }
  );

  myEventsAndCallsToAction = pipe(
    this.assembleStore.myCallsToAction,
    callsToActions => sliceAndJoin(this.eventsByCallToAction, callsToActions),
    eventsByCallToAction =>
      sliceAndJoin(
        this.eventsCallToActionsAndAssemblies,
        Array.from(eventsByCallToAction.values())
      )
  );

  myEvents = pipe(this.myEventsAndCallsToAction, eventsCallsAndAssemblies => {
    const myEventsAndProposals = Array.from(eventsCallsAndAssemblies.entries())
      .filter(([hash, [event, callToAction]]) => event?.record && callToAction)
      .map(([h, [e, callToAction]]) => [h, [e, callToAction]]) as Array<
      [
        ActionHash,
        [
          { record: EntryRecord<Event>; isCancelled: boolean },
          [EntryRecord<CallToAction>, ActionHash[]]
        ]
      ]
    >;
    const events = myEventsAndProposals.filter(
      ([h, [event, [callToAction, assemblies]]]) => assemblies.length > 0
    );

    function sortAndMap(
      events: Array<
        [
          ActionHash,
          [
            { record: EntryRecord<Event>; isCancelled: boolean },
            [EntryRecord<CallToAction>, ActionHash[]]
          ]
        ]
      >
    ) {
      return events
        .sort(
          ([_, [e1]], [__, [e2]]) =>
            e1.record.entry.start_time - e2.record.entry.start_time
        )
        .map(([h]) => h);
    }

    const cancelled = events.filter(([h, [event]]) => event.isCancelled);

    const notCancelled = events.filter(([h, [event]]) => !event.isCancelled);

    const upcoming = notCancelled.filter(
      ([h, [event]]) => !isPast(event.record.entry)
    );
    const past = notCancelled.filter(([h, [event]]) =>
      isPast(event.record.entry)
    );
    return completed({
      upcoming: sortAndMap(upcoming),
      past: sortAndMap(past),
      cancelled: sortAndMap(cancelled),
    });
  });

  myEventsProposals = pipe(
    this.myEventsAndCallsToAction,
    eventsCallsAndAssemblies => {
      const myEventsAndProposals = Array.from(
        eventsCallsAndAssemblies.entries()
      )
        .filter(
          ([hash, [event, callToAction]]) => event?.record && callToAction
        )
        .map(([h, [e, callToAction]]) => [h, [e, callToAction]]) as Array<
        [
          ActionHash,
          [
            { record: EntryRecord<Event>; isCancelled: boolean },
            [EntryRecord<CallToAction>, ActionHash[]]
          ]
        ]
      >;
      const events = myEventsAndProposals.filter(
        ([h, [event, [callToAction, assemblies]]]) => assemblies.length == 0
      );

      function sortAndMap(
        events: Array<
          [
            ActionHash,
            [
              { record: EntryRecord<Event>; isCancelled: boolean },
              [EntryRecord<CallToAction>, ActionHash[]]
            ]
          ]
        >
      ) {
        return events
          .sort(
            ([_, [e1]], [__, [e2]]) =>
              e1.record.entry.start_time - e2.record.entry.start_time
          )
          .map(([h]) => h);
      }

      const cancelled = events.filter(([h, [event]]) => event.isCancelled);

      const notCancelled = events.filter(([h, [event]]) => !event.isCancelled);

      const upcoming = notCancelled.filter(
        ([h, [event]]) => !isPast(event.record.entry)
      );
      const expired = notCancelled.filter(([h, [event, [callToAction]]]) =>
        isExpired(callToAction.entry)
      );
      return completed({
        upcoming: sortAndMap(upcoming),
        expired: sortAndMap(expired),
        cancelled: sortAndMap(cancelled),
      });
    }
  );

  eventsCallToActionsAndAssemblies = new LazyHoloHashMap(
    (eventHash: ActionHash) =>
      asyncDeriveAndJoin(this.events.get(eventHash), event =>
        event
          ? (join([
              this.assembleStore.callToActions.get(
                event.record.entry.call_to_action_hash
              ),
              this.assembleStore.assembliesForCallToAction.get(
                event.record.entry.call_to_action_hash
              ),
            ]) as AsyncReadable<
              [EntryRecord<CallToAction> | undefined, ActionHash[]]
            >)
          : completed(undefined)
      )
  );

  eventsByAuthor = new LazyHoloHashMap((author: AgentPubKey) =>
    lazyLoadAndPoll(async () => {
      const records = await this.client.getEventsByAuthor(author);
      return records.map(r => r.actionHash);
    }, 4000)
  );
}
