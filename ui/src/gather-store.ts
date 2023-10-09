import {
  AssembleClient,
  AssembleStore,
  Assembly,
  CallToAction,
  Commitment,
  Satisfaction,
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
  toPromise,
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
import { intersection, isExpired, isPast } from './utils.js';
import { AlertsStore } from './alerts/alerts-store.js';
import { msg } from '@lit/localize';

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
    return 'open_event_proposal';
  }
  if (isPast(event.entry)) return 'past_event';
  return 'upcoming_event';
}

export type EventUpdate = {
  type: 'event_was_cancelled';
};

export type EventAlert = {
  eventHash: ActionHash;
  update: EventUpdate;
};

export class GatherStore {
  constructor(
    public client: GatherClient,
    public assembleStore: AssembleStore,
    public alertsStore: AlertsStore<EventAlert>
  ) {
    client.onSignal(async signal => {
      if (signal.type === 'EntryDeleted') {
        const eventHash = signal.action.hashed.content.deletes_address;
        const participants = await toPromise(
          this.participantsForEvent.get(eventHash)
        );
        this.alertsStore.client.notifyAlert(participants, {
          eventHash,
          update: {
            type: 'event_was_cancelled',
          },
        });
      }
    });
  }

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
            pipe(
              this.assembleStore.callToActions.get(
                event.entry.call_to_action_hash
              ),
              c => {
                if (!c) throw new Error('Call to action not found');
                return c;
              }
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
          callToAction,
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

  async commitToParticipate(
    event: EntryRecord<Event>
  ): Promise<EntryRecord<Commitment>> {
    const callToActionHash = event.entry.call_to_action_hash;
    const callToAction = await toPromise(
      this.assembleStore.callToActions.get(callToActionHash)
    );
    const commitmentsForCallToAction = await toPromise(
      this.assembleStore.commitmentsForCallToAction.get(callToActionHash)
    );
    const participants = await toPromise(
      this.participantsForEvent.get(event.actionHash)
    );

    if (!callToAction)
      throw new Error(msg('Error fetching the call to action for the event.'));

    const myCommitment = await this.assembleStore.client.createCommitment({
      amount: 1,
      call_to_action_hash: callToActionHash,
      comment: '',
      need_index: 0,
    });

    const minNecessaryParticipants = callToAction.entry.needs[0].min_necessary;

    if (
      minNecessaryParticipants > 0 &&
      participants.length + 1 === minNecessaryParticipants
    ) {
      const satisfaction = await this.assembleStore.client.createSatisfaction({
        call_to_action_hash: callToActionHash,
        need_index: 0,
        commitments_hashes: [
          myCommitment.actionHash,
          ...commitmentsForCallToAction.map(c => c.actionHash),
        ],
      });

      if (callToAction.entry.needs.length === 1) {
        await this.assembleStore.client.createAssembly({
          call_to_action_hash: callToActionHash,
          satisfactions_hashes: [satisfaction.actionHash],
        });
      }
    }
    return myCommitment;
  }

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
  allOpenEventProposals = pipe(
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

  /** My events */

  myEvents = lazyLoadAndPoll(() => this.client.getMyEvents(), 4000);

  myPastEvents = pipe(
    joinAsync([this.myEvents, this.allPastEvents]),
    ([myEventsHashes, allPastEventsHashes]) =>
      intersection(myEventsHashes, allPastEventsHashes)
  );

  myCancelledEvents = pipe(
    joinAsync([this.myEvents, this.allCancelledEvents]),
    ([myEventsHashes, allCancelledEventsHashes]) =>
      intersection(myEventsHashes, allCancelledEventsHashes)
  );

  myUpcomingEvents = pipe(
    joinAsync([this.myEvents, this.allUpcomingEvents]),
    ([myEventsHashes, allUpcomingEventsHashes]) =>
      intersection(myEventsHashes, allUpcomingEventsHashes)
  );

  myOpenEventProposals = pipe(
    joinAsync([this.myEvents, this.allOpenEventProposals]),
    ([myEventsHashes, allOpenEventProposalsHashes]) =>
      intersection(myEventsHashes, allOpenEventProposalsHashes)
  );

  myExpiredEventProposals = pipe(
    joinAsync([this.myEvents, this.allExpiredEventProposals]),
    ([myEventsHashes, allExpiredEventProposalsHashes]) =>
      intersection(myEventsHashes, allExpiredEventProposalsHashes)
  );

  myCancelledEventProposals = pipe(
    joinAsync([this.myEvents, this.allCancelledEventProposals]),
    ([myEventsHashes, allCancelledEventProposalsHashes]) =>
      intersection(myEventsHashes, allCancelledEventProposalsHashes)
  );

  unreadAlerts = asyncDeriveAndJoin(
    this.alertsStore.unreadAlerts,
    unreadAlerts => {
      const eventsHashes = unreadAlerts.map(a => a.alert.eventHash);

      return sliceAndJoin(this.events, eventsHashes);
    }
  );
}
