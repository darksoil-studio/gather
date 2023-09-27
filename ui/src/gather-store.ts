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
  joinAsync,
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
import { ActionHash, AgentPubKey, SignedActionHashed } from '@holochain/client';

import { Event, EventStatus, EventWithStatus } from './types.js';
import { GatherClient } from './gather-client';
import { isExpired, isPast } from './utils.js';

export function filterFutureEvents(
  events: HoloHashMap<ActionHash, EntryRecord<Event>>
): Array<ActionHash> {
  return Array.from(events.entries())
    .filter(([h, event]) => !isPast(event.entry))
    .sort(
      ([h1, event1], [h2, event2]) =>
        event1.entry.start_time - event2.entry.start_time
    )
    .map(([h, _]) => h);
}

export function filterPastEvents(
  events: HoloHashMap<ActionHash, EntryRecord<Event>>
): Array<ActionHash> {
  return Array.from(events.entries())
    .filter(([h, event]) => isPast(event.entry))
    .sort(
      ([h1, event1], [h2, event2]) =>
        event2.entry.start_time - event1.entry.start_time
    )
    .map(([h, _]) => h);
}

export function deriveStatus(
  event: EntryRecord<Event>,
  cancellations: Array<SignedActionHashed> | undefined,
  callToAction: EntryRecord<CallToAction> | undefined,
  assemblies: ActionHash[]
): EventStatus {
  const isEventProposal = assemblies.length === 0;
  const isCancelled = cancellations && cancellations.length > 0;

  if (isEventProposal && isCancelled) return 'cancelled_event_proposal';
  if (!isEventProposal && isCancelled) return 'cancelled_event';
  if (isEventProposal && callToAction) {
    if (isExpired(callToAction.entry)) return 'expired_event_proposal';
    else return 'open_event_proposal';
  }
  if (isPast(event.entry)) return 'past_event';
  return 'upcoming_event';
}

export class GatherStore {
  constructor(
    public client: GatherClient,
    public assembleStore: AssembleStore
  ) {}

  /** Event */

  events = new LazyHoloHashMap<ActionHash, AsyncReadable<EventWithStatus>>(
    (eventHash: ActionHash) =>
      pipe(
        lazyLoadAndPoll(async () => this.client.getEvent(eventHash), 4000),
        event => {
          if (!event) throw new Error('Event not found');

          return joinAsync([
            completed(event),
            this.eventCancellations.get(eventHash),
            this.assembleStore.callToActions.get(
              event.entry.call_to_action_hash
            ),
            this.assembleStore.assembliesForCallToAction.get(
              event.entry.call_to_action_hash
            ),
          ]);
        },
        ([event, cancellations, callToAction, assemblies]) => ({
          originalActionHash: eventHash,
          currentEvent: event,
          status: deriveStatus(event, cancellations, callToAction, assemblies),
        })
      )
  );

  eventCancellations = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(
      async () => this.client.getEventCancellations(eventHash),
      4000
    )
  );

  /** Participants for Event */

  participantsForEvent = new LazyHoloHashMap((eventHash: ActionHash) =>
    pipe(
      this.events.get(eventHash),
      event =>
        this.assembleStore.commitmentsForCallToAction.get(
          event.currentEvent.entry.call_to_action_hash
        ),
      commitments =>
        commitments
          .filter(c => c.entry.need_index === 0)
          .map(c => c.action.author)
    )
  );

  // Will contain an ordered list of the original action hashes for the upcoming events
  allUpcomingEvents = pipe(
    lazyLoadAndPoll(() => this.client.getAllUpcomingEvents(), 4000),
    upcomingEventsHashes => sliceAndJoin(this.events, upcomingEventsHashes),
    upcomingEvents => {
      const events = [];
      for (const [eventHash, eventWithStatus] of upcomingEvents.entries()) {
        if (eventWithStatus.status === 'past_event') {
          this.client.markEventPast(eventHash);
        } else if (eventWithStatus.status === 'upcoming_event') {
          events.push(eventWithStatus);
        }
      }
      return events
        .sort(
          (event1, event2) =>
            event2.currentEvent.entry.start_time -
            event1.currentEvent.entry.start_time
        )
        .map(e => e.originalActionHash);
    }
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allCancelledEvents = lazyLoadAndPoll(
    () => this.client.getAllCancelledEvents(),
    4000
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allPastEvents = lazyLoadAndPoll(() => this.client.getAllPastEvents(), 4000);

  // Will contain an ordered list of the original action hashes for the upcoming events
  allOpenEventsProposals = pipe(
    lazyLoadAndPoll(() => this.client.getAllOpenEventProposals(), 1000),
    openEventProposalsHashes =>
      sliceAndJoin(this.events, openEventProposalsHashes),
    openEventProposals => {
      const events = [];
      for (const [eventHash, eventWithStatus] of openEventProposals.entries()) {
        if (eventWithStatus.status === 'expired_event_proposal') {
          this.client.markEventProposalExpired(eventHash);
        } else if (eventWithStatus.status === 'open_event_proposal') {
          events.push(eventWithStatus);
        }
      }
      return events
        .sort(
          (event1, event2) =>
            event2.currentEvent.entry.start_time -
            event1.currentEvent.entry.start_time
        )
        .map(e => e.originalActionHash);
    }
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allCancelledEventProposals = lazyLoadAndPoll(
    () => this.client.getAllCancelledEventProposals(),
    4000
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allExpiredEventProposals = lazyLoadAndPoll(
    () => this.client.getAllExpiredEventProposals(),
    4000
  );

  /** All events */

  // allEvents = pipe(
  //   this.assembleStore.allAssemblies,
  //   allAssemblies => sliceAndJoin(this.assembleStore.assemblies, allAssemblies),
  //   (allAssemblies: ReadonlyMap<ActionHash, EntryRecord<Assembly>>) =>
  //     mapAndJoin(allAssemblies, assembly =>
  //       this.eventsByCallToAction.get(assembly.entry.call_to_action_hash)
  //     ),
  //   eventsHashes => sliceAndJoin(this.events, Array.from(eventsHashes.values()))
  // );

  // allNonCancelledEvents = pipe(this.allEvents, events =>
  //   pickBy(events, event => !event.isCancelled)
  // );

  // allCancelledEvents = pipe(this.allEvents, events =>
  //   pickBy(events, event => event.isCancelled)
  // );

  // allFutureEvents = pipe(this.allNonCancelledEvents, filterFutureEvents);

  // allPastEvents = pipe(this.allNonCancelledEvents, filterPastEvents);

  // allEventProposals = pipe(
  //   this.assembleStore.openCallsToAction,
  //   callsToAction =>
  //     sliceAndJoin(this.eventsByCallToAction, Array.from(callsToAction.keys())),
  //   eventsHashes =>
  //     sliceAndJoin(this.events, Array.from(eventsHashes.values())),
  //   events => {
  //     const allEventProposals: HoloHashMap<
  //       ActionHash,
  //       EntryRecord<Event>
  //     > = new HoloHashMap();

  //     for (const [eventHash, event] of Array.from(events.entries())) {
  //       if (event) {
  //         if (event.isCancelled || isPast(event.record.entry)) {
  //           this.assembleStore.client.closeCallToAction(
  //             event.record.entry.call_to_action_hash
  //           );
  //         }
  //         allEventProposals.set(eventHash, event.record);
  //       }
  //     }
  //     return allEventProposals;
  //   }
  // );

  // allFutureEventProposals = pipe(this.allEventProposals, filterFutureEvents);

  // allPastEventProposals = pipe(this.allEventProposals, filterPastEvents);

  // myEventsAndCallsToAction = pipe(
  //   this.assembleStore.myCallsToAction,
  //   callsToActions => sliceAndJoin(this.eventsByCallToAction, callsToActions),
  //   eventsByCallToAction =>
  //     sliceAndJoin(
  //       this.eventsCallToActionsAndAssemblies,
  //       Array.from(eventsByCallToAction.values())
  //     )
  // );

  // myEvents = pipe(this.myEventsAndCallsToAction, eventsCallsAndAssemblies => {
  //   const myEventsAndProposals = Array.from(eventsCallsAndAssemblies.entries())
  //     .filter(([hash, [event, callToAction]]) => event?.record && callToAction)
  //     .map(([h, [e, callToAction]]) => [h, [e, callToAction]]) as Array<
  //     [
  //       ActionHash,
  //       [
  //         { record: EntryRecord<Event>; isCancelled: boolean },
  //         [EntryRecord<CallToAction>, ActionHash[]]
  //       ]
  //     ]
  //   >;
  //   const events = myEventsAndProposals.filter(
  //     ([h, [event, [callToAction, assemblies]]]) => assemblies.length > 0
  //   );

  //   function sortAndMap(
  //     events2: Array<
  //       [
  //         ActionHash,
  //         [
  //           { record: EntryRecord<Event>; isCancelled: boolean },
  //           [EntryRecord<CallToAction>, ActionHash[]]
  //         ]
  //       ]
  //     >
  //   ) {
  //     return events2
  //       .sort(
  //         ([_, [e1]], [__, [e2]]) =>
  //           e1.record.entry.start_time - e2.record.entry.start_time
  //       )
  //       .map(([h]) => h);
  //   }

  //   const cancelled = events.filter(([h, [event]]) => event.isCancelled);

  //   const notCancelled = events.filter(([h, [event]]) => !event.isCancelled);

  //   const upcoming = notCancelled.filter(
  //     ([h, [event]]) => !isPast(event.record.entry)
  //   );
  //   const past = notCancelled.filter(([h, [event]]) =>
  //     isPast(event.record.entry)
  //   );
  //   return {
  //     upcoming: sortAndMap(upcoming),
  //     past: sortAndMap(past),
  //     cancelled: sortAndMap(cancelled),
  //   };
  // });

  // myEventsProposals = pipe(
  //   this.myEventsAndCallsToAction,
  //   eventsCallsAndAssemblies => {
  //     const myEventsAndProposals = Array.from(
  //       eventsCallsAndAssemblies.entries()
  //     )
  //       .filter(
  //         ([hash, [event, callToAction]]) => event?.record && callToAction
  //       )
  //       .map(([h, [e, callToAction]]) => [h, [e, callToAction]]) as Array<
  //       [
  //         ActionHash,
  //         [
  //           { record: EntryRecord<Event>; isCancelled: boolean },
  //           [EntryRecord<CallToAction>, ActionHash[]]
  //         ]
  //       ]
  //     >;
  //     const events = myEventsAndProposals.filter(
  //       ([h, [event, [callToAction, assemblies]]]) => assemblies.length === 0
  //     );

  //     function sortAndMap(
  //       events2: Array<
  //         [
  //           ActionHash,
  //           [
  //             { record: EntryRecord<Event>; isCancelled: boolean },
  //             [EntryRecord<CallToAction>, ActionHash[]]
  //           ]
  //         ]
  //       >
  //     ) {
  //       return events2
  //         .sort(
  //           ([_, [e1]], [__, [e2]]) =>
  //             e1.record.entry.start_time - e2.record.entry.start_time
  //         )
  //         .map(([h]) => h);
  //     }

  //     const cancelled = events.filter(([h, [event]]) => event.isCancelled);

  //     const notCancelled = events.filter(([h, [event]]) => !event.isCancelled);

  //     const upcoming = notCancelled.filter(
  //       ([h, [event]]) => !isPast(event.record.entry)
  //     );
  //     const expired = notCancelled.filter(([h, [event, [callToAction]]]) =>
  //       isExpired(callToAction.entry)
  //     );
  //     return completed({
  //       upcoming: sortAndMap(upcoming),
  //       expired: sortAndMap(expired),
  //       cancelled: sortAndMap(cancelled),
  //     });
  //   }
  // );

  // eventsCallToActionsAndAssemblies = new LazyHoloHashMap(
  //   (eventHash: ActionHash) =>
  //     asyncDeriveAndJoin(this.events.get(eventHash), event =>
  //       event
  //         ? joinAsync([
  //             this.assembleStore.callToActions.get(
  //               event.record.entry.call_to_action_hash
  //             ),
  //             this.assembleStore.assembliesForCallToAction.get(
  //               event.record.entry.call_to_action_hash
  //             ),
  //           ])
  //         : completed(undefined)
  //     )
  // );

  // eventsByAuthor = new LazyHoloHashMap((author: AgentPubKey) =>
  //   lazyLoadAndPoll(async () => {
  //     const records = await this.client.getEventsByAuthor(author);
  //     return records.map(r => r.actionHash);
  //   }, 4000)
  // );
}
