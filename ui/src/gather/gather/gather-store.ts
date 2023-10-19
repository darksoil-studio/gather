import {
  AssembleStore,
  Assembly,
  CallToAction,
  Commitment,
  Satisfaction,
} from '@darksoil/assemble';
import {
  asyncDeriveAndJoin,
  AsyncReadable,
  completed,
  joinAsync,
  lazyLoadAndPoll,
  pipe,
  sliceAndJoin,
  toPromise,
} from '@holochain-open-dev/stores';
import {
  EntryRecord,
  LazyHoloHashMap,
  HoloHashMap,
} from '@holochain-open-dev/utils';
import { CancellationsStore } from '@holochain-open-dev/cancellations';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { msg } from '@lit/localize';

import {
  Proposal,
  Event,
  EventStatus,
  EventWithStatus,
  EventActivity,
  ProposalWithStatus,
  ProposalStatus,
} from './types.js';
import { GatherClient } from './gather-client.js';
import { intersection, isExpired, isPast } from './utils.js';
import { AlertsStore } from '../../alerts/alerts-store.js';

// export function filterFutureEvents(
//   events: HoloHashMap<ActionHash, EntryRecord<Event>>
// ): Array<ActionHash> {
//   return Array.from(events.entries())
//     .filter(([h, event]) => !isPast(event.entry))
//     .sort(
//       ([h1, event1], [h2, event2]) =>
//         event1.entry.start_time - event2.entry.start_time
//     )
//     .map(([h, _]) => h);
// }

// export function filterPastEvents(
//   events: HoloHashMap<ActionHash, EntryRecord<Event>>
// ): Array<ActionHash> {
//   return Array.from(events.entries())
//     .filter(([h, event]) => isPast(event.entry))
//     .sort(
//       ([h1, event1], [h2, event2]) =>
//         event2.entry.start_time - event1.entry.start_time
//     )
//     .map(([h, _]) => h);
// }

export function deriveStatus(
  event: EntryRecord<Event>,
  cancellations: Array<ActionHash>
): EventStatus {
  const isCancelled = cancellations.length > 0;

  if (isCancelled) return 'cancelled_event';
  if (isPast(event.entry)) return 'past_event';
  return 'upcoming_event';
}

export function deriveProposalStatus(
  proposal: EntryRecord<Proposal>,
  cancellations: Array<ActionHash>,
  callToAction: EntryRecord<CallToAction>,
  events: ActionHash[]
): ProposalStatus {
  if (events.length > 0)
    return {
      type: 'fulfilled_proposal',
      eventHash: events[0],
    };
  if (cancellations.length > 0) return { type: 'cancelled_proposal' };
  if (
    !!callToAction.entry.expiration_time &&
    callToAction.entry.expiration_time < Date.now() * 1000
  )
    return { type: 'expired_proposal' };
  return { type: 'open_proposal' };
}

export type EventUpdate = {
  type: 'event_was_cancelled';
};

export type EventAlert = {
  author: AgentPubKey;
  eventHash: ActionHash;
  update: EventUpdate;
};

export class GatherStore {
  constructor(
    public client: GatherClient,
    public assembleStore: AssembleStore,
    public alertsStore: AlertsStore<EventAlert>,
    public cancellationsStore: CancellationsStore
  ) {
    cancellationsStore.client.onSignal(async signal => {
      if (signal.type === 'EntryCreated') {
        if (signal.app_entry.type === 'Cancellation') {
          // Something was cancelled
          const cancelledHash = signal.app_entry.cancelled_hash;
          try {
            const proposal = await toPromise(this.proposals.get(cancelledHash));
            await this.client.markProposalAsCancelled(cancelledHash);
          } catch (e) {
            console.log(e);
          }
          try {
            const event = await toPromise(this.events.get(cancelledHash));
            await this.client.markEventAsCancelled(cancelledHash);
          } catch (e) {}
          // const eventHash = signal.action.hashed.content.deletes_address;
          // let participants = await toPromise(
          //   this.participantsForEvent.get(eventHash)
          // );
          // participants = participants.filter(
          //   p => p.toString() !== this.client.client.myPubKey.toString()
          // );
          // this.alertsStore.client.notifyAlert(participants, {
          //   author: this.client.client.myPubKey,
          //   eventHash,
          //   update: {
          //     type: 'event_was_cancelled',
          //   },
          // });
        }
      } else if (signal.type === 'EntryDeleted') {
        if (signal.original_app_entry.type === 'Cancellation') {
          // Some cancellation was undone
        }
      }
    });
  }

  /** Event */

  events = new LazyHoloHashMap((eventHash: ActionHash) =>
    pipe(
      lazyLoadAndPoll(async () => this.client.getEvent(eventHash), 4000),

      event => {
        if (!event) throw new Error('Event not found');
        return event;
      }
    )
  );

  eventsStatus = new LazyHoloHashMap<
    ActionHash,
    AsyncReadable<EventWithStatus>
  >((eventHash: AgentPubKey) =>
    pipe(
      this.events.get(eventHash),
      _ => this.cancellationsStore.cancellationsFor.get(eventHash),

      (cancellations, event) => ({
        originalActionHash: eventHash,
        currentEvent: event,
        status: deriveStatus(event, cancellations),
      })
    )
  );

  proposals = new LazyHoloHashMap((proposalHash: ActionHash) =>
    pipe(
      lazyLoadAndPoll(async () => this.client.getProposal(proposalHash), 4000),

      proposal => {
        if (!proposal) throw new Error('Proposal not found');
        return proposal;
      }
    )
  );

  proposalsStatus = new LazyHoloHashMap<
    ActionHash,
    AsyncReadable<ProposalWithStatus>
  >((proposalHash: ActionHash) =>
    pipe(
      this.proposals.get(proposalHash),
      proposal =>
        joinAsync([
          this.cancellationsStore.cancellationsFor.get(proposalHash),
          this.assembleStore.callToActions.get(
            proposal.entry.call_to_action_hash
          ),
          this.eventsForProposal.get(proposalHash),
        ]),
      ([cancellations, callToAction, events], proposal) => ({
        originalActionHash: proposalHash,
        currentProposal: proposal,
        status: deriveProposalStatus(
          proposal,
          cancellations,
          callToAction,
          events
        ),
        callToAction,
      })
    )
  );

  eventRevisions = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(
      async () => this.client.getAllEventRevisions(eventHash),
      10000
    )
  );

  proposalRevisions = new LazyHoloHashMap((proposalHash: ActionHash) =>
    lazyLoadAndPoll(
      async () => this.client.getAllProposalRevisions(proposalHash),
      10000
    )
  );

  eventsForProposal = new LazyHoloHashMap((proposalHash: ActionHash) =>
    lazyLoadAndPoll(
      async () => this.client.getEventsForProposal(proposalHash),
      10000
    )
  );

  // eventActivity = new LazyHoloHashMap<ActionHash, AsyncReadable<EventActivity>>(
  //   (eventHash: ActionHash) =>
  //     pipe(
  //       this.events.get(eventHash),

  //       event => {
  //         return joinAsync([
  //           this.eventRevisions.get(eventHash),
  //           pipe(this.eventCancellations.get(eventHash), hashes =>
  //             sliceAndJoin(this.cancellations, hashes)
  //           ),
  //           this.assembleStore.commitmentsForCallToAction.get(
  //             event.entry.call_to_action_hash
  //           ),
  //           this.assembleStore.satisfactionsForCallToAction.get(
  //             event.entry.call_to_action_hash
  //           ),
  //           pipe(
  //             this.assembleStore.assembliesForCallToAction.get(
  //               event.entry.call_to_action_hash
  //             ),
  //             hashes => sliceAndJoin(this.assembleStore.assemblies, hashes)
  //           ),
  //         ]);
  //       },
  //       (
  //         [revisions, cancellations, commitments, satisfactions, assemblies],
  //         event
  //       ) => {
  //         let activity: EventActivity = [
  //           { type: 'event_created', record: event },
  //         ];
  //         const revisionsActivity: EventActivity = revisions
  //           .slice(1)
  //           .map(c => ({
  //             type: 'event_updated',
  //             record: c,
  //           }));
  //         const commitmentActivity: EventActivity = commitments.map(c => ({
  //           type: 'commitment_created',
  //           record: c,
  //         }));
  //         const cancellationsActivity: EventActivity = Array.from(
  //           cancellations.values()
  //         ).map(c => ({
  //           type: 'event_cancelled',
  //           record: c,
  //         }));
  //         const satisfactionsActivity: EventActivity = satisfactions.map(c => ({
  //           type: 'satisfaction_created',
  //           record: c,
  //         }));
  //         const assembliesActivity: EventActivity = Array.from(
  //           assemblies.values()
  //         ).map(c => ({
  //           type: 'assembly_created',
  //           record: c,
  //         }));
  //         activity = [
  //           ...activity,
  //           ...revisionsActivity,
  //           ...commitmentActivity,
  //           ...cancellationsActivity,
  //           ...satisfactionsActivity,
  //           ...assembliesActivity,
  //         ];

  //         activity = activity.sort(
  //           (r1, r2) =>
  //             r1.record.record.signed_action.hashed.content.timestamp -
  //             r2.record.record.signed_action.hashed.content.timestamp
  //         );
  //         return activity;
  //       }
  //     )
  // );

  /** Participants for Event */

  participantsForCallToAction = new LazyHoloHashMap(
    (callToActionHash: ActionHash) =>
      pipe(
        this.assembleStore.commitmentsForCallToAction.get(callToActionHash),
        commitmentsHashes =>
          sliceAndJoin(this.assembleStore.commitments, commitmentsHashes),
        commitments =>
          Array.from(commitments.values())
            .filter(c => c.entry.need_index === 0)
            .map(c => c.action.author)
      )
  );

  participantsForProposal = new LazyHoloHashMap((proposalHash: ActionHash) =>
    pipe(this.proposals.get(proposalHash), proposal =>
      this.participantsForCallToAction.get(proposal.entry.call_to_action_hash)
    )
  );

  participantsForEvent = new LazyHoloHashMap((eventHash: ActionHash) =>
    pipe(this.events.get(eventHash), event =>
      this.participantsForCallToAction.get(event.entry.call_to_action_hash)
    )
  );

  interestedInEvent = new LazyHoloHashMap((eventHash: ActionHash) =>
    pipe(
      joinAsync([
        lazyLoadAndPoll(() => this.client.getInterestedIn(eventHash), 4000),

        this.events.get(eventHash),
      ]),
      ([_participants, event]) => {
        const stores = [
          this.participantsForCallToAction.get(event.entry.call_to_action_hash),
        ];
        if (event.entry.from_proposal) {
          stores.push(
            this.interestedInProposal.get(
              event.entry.from_proposal.proposal_hash
            )
          );
        }
        return joinAsync(stores);
      },
      (p, [eventParticipants]) => {
        const participants = new HoloHashMap<AgentPubKey, boolean>();

        for (const eventParticipant of eventParticipants) {
          participants.set(eventParticipant, true);
        }

        for (const proposalParticipant of p[0]) {
          participants.set(proposalParticipant, true);
        }
        if (p[1]) {
          // Remove all participants that have actually committed to go
          for (const participant of p[1]) {
            participants.delete(participant);
          }
        }

        return Array.from(participants.keys());
      }
    )
  );

  interestedInProposal = new LazyHoloHashMap((proposalHash: ActionHash) =>
    lazyLoadAndPoll(() => this.client.getInterestedIn(proposalHash), 4000)
  );

  // Will contain an ordered list of the original action hashes for the upcoming events
  allUpcomingEvents = pipe(
    lazyLoadAndPoll(() => this.client.getAllUpcomingEvents(), 4000),
    upcomingEventsHashes =>
      sliceAndJoin(this.eventsStatus, upcomingEventsHashes),
    upcomingEvents => {
      const events = [];
      for (const [eventHash, eventWithStatus] of upcomingEvents.entries()) {
        if (eventWithStatus.status === 'past_event') {
          this.client.markEventAsPast(eventHash);
        } else if (eventWithStatus.status === 'upcoming_event') {
          events.push(eventWithStatus);
        }
      }
      return events
        .sort(
          (event1, event2) =>
            event2.currentEvent.entry.time.start_time -
            event1.currentEvent.entry.time.start_time
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
  allOpenProposals = pipe(
    lazyLoadAndPoll(() => this.client.getAllOpenProposals(), 1000),
    openProposalsHashes =>
      sliceAndJoin(this.proposalsStatus, openProposalsHashes),
    openProposals => {
      const proposals = [];
      for (const [
        proposalHash,
        proposalWithStatus,
      ] of openProposals.entries()) {
        if (proposalWithStatus.status.type === 'expired_proposal') {
          this.client.markProposalAsExpired(proposalHash);
        } else if (proposalWithStatus.status.type === 'open_proposal') {
          proposals.push(proposalWithStatus);
        }
      }
      return proposals
        .sort(
          (proposal1, proposal2) =>
            (proposal2.currentProposal.entry.time
              ? proposal2.currentProposal.entry.time.start_time
              : Number.MAX_VALUE) -
            (proposal1.currentProposal.entry.time
              ? proposal1.currentProposal.entry.time.start_time
              : Number.MAX_VALUE)
        )
        .map(e => e.originalActionHash);
    }
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allCancelledProposals = lazyLoadAndPoll(
    () => this.client.getAllCancelledProposals(),
    4000
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allExpiredProposals = lazyLoadAndPoll(
    () => this.client.getAllExpiredProposals(),
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

  myOpenProposals = pipe(
    joinAsync([this.myEvents, this.allOpenProposals]),
    ([myEventsHashes, allOpenProposalsHashes]) =>
      intersection(myEventsHashes, allOpenProposalsHashes)
  );

  myExpiredProposals = pipe(
    joinAsync([this.myEvents, this.allExpiredProposals]),
    ([myEventsHashes, allExpiredProposalsHashes]) =>
      intersection(myEventsHashes, allExpiredProposalsHashes)
  );

  myCancelledProposals = pipe(
    joinAsync([this.myEvents, this.allCancelledProposals]),
    ([myEventsHashes, allCancelledProposalsHashes]) =>
      intersection(myEventsHashes, allCancelledProposalsHashes)
  );

  unreadAlerts = asyncDeriveAndJoin(
    this.alertsStore.unreadAlerts,
    unreadAlerts => {
      const eventsHashes = unreadAlerts.map(a => a.alert.eventHash);

      return sliceAndJoin(this.events, eventsHashes);
    }
  );
}
