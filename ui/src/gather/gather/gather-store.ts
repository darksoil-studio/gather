import { AssembleStore, CallToAction, Commitment } from '@darksoil/assemble';
import {
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
  LazyMap,
} from '@holochain-open-dev/utils';
import {
  Cancellation,
  CancellationsStore,
  UndoneCancellation,
} from '@holochain-open-dev/cancellations';
import {
  ActionHash,
  AgentPubKey,
  CreateLink,
  DeleteLink,
} from '@holochain/client';

import {
  Proposal,
  Event,
  EventStatus,
  EventWithStatus,
  ProposalWithStatus,
  ProposalStatus,
  IndexedHash,
} from './types.js';
import { GatherClient } from './gather-client.js';
import { intersection, isPast, uniquify } from './utils.js';
import { AlertsStore } from '../../alerts/alerts-store.js';
import { Alert } from '../../alerts/alerts-client.js';
import {
  actionTimestamp,
  EventAction,
  EventActionOnlyHash,
  EventActionTypes,
  EventActivity,
} from './activity.js';

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
  assemblies: ActionHash[],
  events: ActionHash[]
): ProposalStatus {
  if (events.length > 0)
    return {
      type: 'actual_event',
      eventHash: events[0],
    };
  if (assemblies.length > 0)
    return {
      type: 'fulfilled_proposal',
      assemblyHash: assemblies[0],
    };
  if (cancellations.length > 0) return { type: 'cancelled_proposal' };
  if (
    !!callToAction.entry.expiration_time &&
    callToAction.entry.expiration_time < Date.now() * 1000
  )
    return { type: 'expired_proposal' };
  return { type: 'open_proposal' };
}

export interface EventAlert {
  eventHash: ActionHash;
  action: EventActionOnlyHash;
}

export interface ProposalAlert {
  proposalHash: ActionHash;
  action: EventActionOnlyHash;
}

export type GatherAlert =
  | ({
      type: 'event_alert';
    } & EventAlert)
  | ({
      type: 'proposal_alert';
    } & ProposalAlert);

export class GatherStore {
  constructor(
    public client: GatherClient,
    public assembleStore: AssembleStore,
    public alertsStore: AlertsStore<GatherAlert>,
    public cancellationsStore: CancellationsStore
  ) {
    client.onSignal(async signal => {
      if (signal.type === 'EntryCreated') {
        if (signal.app_entry.type === 'Proposal') {
          await alertsStore.client.notifyAlert(signal.app_entry.hosts, {
            type: 'proposal_alert',
            proposalHash: signal.action.hashed.hash,
            action: {
              type: 'proposal_created',
              actionHash: signal.action.hashed.hash,
            },
          });
        } else if (signal.app_entry.type === 'Event') {
          if (signal.app_entry.from_proposal) {
            const participants = await toPromise(
              this.participantsForProposal.get(
                signal.app_entry.from_proposal.proposal_hash
              )
            );
            const interested = await toPromise(
              this.interestedInProposal.get(
                signal.app_entry.from_proposal.proposal_hash
              )
            );
            await alertsStore.client.notifyAlert(
              [
                ...Array.from(participants.keys()),
                ...interested,
                ...signal.app_entry.hosts,
              ],
              {
                type: 'event_alert',
                eventHash: signal.action.hashed.hash,
                action: {
                  type: 'event_created',
                  actionHash: signal.action.hashed.hash,
                },
              }
            );
          } else {
            await alertsStore.client.notifyAlert(signal.app_entry.hosts, {
              type: 'event_alert',
              eventHash: signal.action.hashed.hash,
              action: {
                type: 'event_created',
                actionHash: signal.action.hashed.hash,
              },
            });
          }
        }
      } else if (signal.type === 'EntryUpdated') {
        if (signal.app_entry.type === 'Event') {
          let lastUpdate: ActionHash | undefined =
            signal.action.hashed.content.original_action_address;
          let originalAction = lastUpdate;

          while (lastUpdate) {
            const event: EntryRecord<Event> | undefined =
              await this.client.getEvent(lastUpdate);
            lastUpdate =
              event?.action.type === 'Update'
                ? event.action.original_action_address
                : undefined;
            if (lastUpdate) {
              originalAction = lastUpdate;
            }
          }
          await this.notifyOfEventAction(originalAction, {
            actionHash: signal.action.hashed.hash,
            type: 'event_updated',
          });
        }
      }
    });
    assembleStore.client.onSignal(async signal => {
      if (signal.type === 'EntryCreated') {
        if (signal.app_entry.type === 'Assembly') {
          const callToAction = await toPromise(
            this.assembleStore.callToActions.get(
              signal.app_entry.call_to_action_hash
            )
          );
          const allOpenProposals = await toPromise(
            sliceAndJoin(
              this.proposals,
              (await toPromise(this.allOpenProposals)).map(h => h.hash)
            )
          );

          for (const [proposalHash, proposal] of allOpenProposals) {
            if (
              proposal.entry.call_to_action_hash.toString() ===
              callToAction.actionHash.toString()
            ) {
              if (proposal.entry.time && proposal.entry.location) {
                await this.client.createEvent({
                  ...(proposal.entry as Event),
                  from_proposal: {
                    proposal_hash: proposalHash,
                    assembly_hash: signal.action.hashed.hash,
                  },
                });
              } else {
                const participants = await toPromise(
                  this.participantsForProposal.get(proposalHash)
                );
                const interested = await toPromise(
                  this.interestedInProposal.get(proposalHash)
                );
                await this.alertsStore.client.notifyAlert(
                  [...Array.from(participants.keys()), ...interested],
                  {
                    type: 'proposal_alert',
                    proposalHash,
                    action: {
                      type: 'assembly_created',
                      actionHash: signal.action.hashed.hash,
                    },
                  }
                );
              }
            }
          }
        } else if (signal.app_entry.type === 'Satisfaction') {
          const callToAction = await toPromise(
            this.assembleStore.callToActions.get(
              signal.app_entry.call_to_action_hash
            )
          );
          const allOpenProposals = await toPromise(
            sliceAndJoin(
              this.proposals,
              (await toPromise(this.allOpenProposals)).map(h => h.hash)
            )
          );

          for (const [proposalHash, proposal] of allOpenProposals) {
            if (
              proposal.entry.call_to_action_hash.toString() ===
              callToAction.actionHash.toString()
            ) {
              const participants = await toPromise(
                this.participantsForProposal.get(proposalHash)
              );
              const interested = await toPromise(
                this.interestedInProposal.get(proposalHash)
              );
              await this.alertsStore.client.notifyAlert(
                [...Array.from(participants.keys()), ...interested],
                {
                  type: 'proposal_alert',
                  proposalHash,
                  action: {
                    type: 'satisfaction_created',
                    actionHash: signal.action.hashed.hash,
                  },
                }
              );
            }
          }
        }
      } else if (signal.type === 'LinkDeleted') {
        if ('CallToActionToSatisfactions' in (signal.link_type as any)) {
          const callToAction = await toPromise(
            this.assembleStore.callToActions.get(
              signal.action.hashed.content.base_address
            )
          );
          const allOpenProposals = await toPromise(
            sliceAndJoin(
              this.proposals,
              (await toPromise(this.allOpenProposals)).map(h => h.hash)
            )
          );

          for (const [proposalHash, proposal] of allOpenProposals) {
            if (
              proposal.entry.call_to_action_hash.toString() ===
              callToAction.actionHash.toString()
            ) {
              await this.notifyOfProposalAction(proposalHash, {
                type: 'satisfaction_deleted',
                actionHash: signal.action.hashed.hash,
              });
            }
          }
          const allUpcomingEvents = await toPromise(
            sliceAndJoin(
              this.events,
              (await toPromise(this.allUpcomingEvents)).map(h => h.hash)
            )
          );

          for (const [eventHash, event] of allUpcomingEvents) {
            if (
              event.entry.call_to_action_hash.toString() ===
              callToAction.actionHash.toString()
            ) {
              await this.notifyOfEventAction(eventHash, {
                type: 'satisfaction_deleted',
                actionHash: signal.action.hashed.hash,
              });
            }
          }
        }
      }
    });
    cancellationsStore.client.onSignal(async signal => {
      if (signal.type === 'EntryCreated') {
        if (signal.app_entry.type === 'Cancellation') {
          // Something was cancelled
          const cancelledHash = signal.app_entry.cancelled_hash;
          try {
            const event = await toPromise(this.events.get(cancelledHash));
            if ('from_proposal' in event.entry) {
              await this.client.markEventAsCancelled(cancelledHash);
              const participants = await toPromise(
                this.participantsForEvent.get(cancelledHash)
              );
              const interested = await toPromise(
                this.interestedInEvent.get(cancelledHash)
              );
              await this.alertsStore.client.notifyAlert(
                [...Array.from(participants.keys()), ...interested],
                {
                  type: 'event_alert',
                  eventHash: cancelledHash,
                  action: {
                    type: 'event_cancelled',
                    actionHash: signal.action.hashed.hash,
                  },
                }
              );
              return;
            }
          } catch (e) {
            console.log(e);
          }
          try {
            const proposal = await toPromise(this.proposals.get(cancelledHash));
            if ('hosts' in proposal.entry) {
              await this.client.markProposalAsCancelled(cancelledHash);
              const proposalHash = cancelledHash;
              const participants = await toPromise(
                this.participantsForProposal.get(proposalHash)
              );
              const interested = await toPromise(
                this.interestedInProposal.get(proposalHash)
              );
              await this.alertsStore.client.notifyAlert(
                [...Array.from(participants.keys()), ...interested],
                {
                  type: 'proposal_alert',
                  proposalHash: cancelledHash,
                  action: {
                    type: 'proposal_cancelled',
                    actionHash: signal.action.hashed.hash,
                  },
                }
              );
              return;
            }
          } catch (e) {
            console.log(e);
          }
          try {
            const commitment = await toPromise(
              this.assembleStore.commitments.get(cancelledHash)
            );
            if (!commitment.entry.amount) return;
            if (commitment.entry.need_index === 0) {
              const myEventsHashes = await toPromise(this.myEvents);

              for (const eventHash of myEventsHashes) {
                const event = await toPromise(this.events.get(eventHash));
                if (
                  event.entry.call_to_action_hash.toString() ===
                  commitment.entry.call_to_action_hash.toString()
                ) {
                  await this.client.removeFromMyEvents(eventHash);
                }
              }
            }
          } catch (e) {
            console.log(e);
          }
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
          this.assembleStore.assembliesForCallToAction.get(
            proposal.entry.call_to_action_hash
          ),
          this.eventsForProposal.get(proposalHash),
        ]),
      ([cancellations, callToAction, assemblies, events], proposal) => ({
        originalActionHash: proposalHash,
        currentProposal: proposal,
        status: deriveProposalStatus(
          proposal,
          cancellations,
          callToAction,
          assemblies,
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

  callToActionActivity = new LazyHoloHashMap<
    ActionHash,
    AsyncReadable<EventActivity>
  >((callToActionHash: ActionHash) =>
    pipe(
      joinAsync([
        pipe(
          this.assembleStore.commitmentsForCallToAction.get(callToActionHash),
          hashes => sliceAndJoin(this.assembleStore.commitments, hashes),
          commitments =>
            joinAsync([
              sliceAndJoin(
                this.cancellationsStore.cancellationsFor,
                Array.from(commitments.keys())
              ),
              sliceAndJoin(
                this.cancellationsStore.undoneCancellationsFor,
                Array.from(commitments.keys())
              ),
            ]),
          ([
            cancellationsHashesByCommitment,
            undoneCancellationsByCommitment,
          ]) => {
            const cancellationsHashes = ([] as ActionHash[]).concat(
              ...Array.from(cancellationsHashesByCommitment.values()),
              ...Array.from(undoneCancellationsByCommitment.values()).map(uc =>
                uc.map(u => u.cancellation_hash)
              )
            );
            return sliceAndJoin(
              this.cancellationsStore.cancellations,
              cancellationsHashes
            );
          },
          (cancellations, [_, undoneCancellations], commitments) =>
            [commitments, cancellations, undoneCancellations] as [
              ReadonlyMap<ActionHash, EntryRecord<Commitment>>,
              ReadonlyMap<ActionHash, EntryRecord<Cancellation>>,
              ReadonlyMap<ActionHash, UndoneCancellation[]>
            ]
        ),
        pipe(
          this.assembleStore.satisfactionsForCallToAction.get(callToActionHash),
          hashes => sliceAndJoin(this.assembleStore.satisfactions, hashes)
        ),
        pipe(
          this.assembleStore.assembliesForCallToAction.get(callToActionHash),
          hashes => sliceAndJoin(this.assembleStore.assemblies, hashes)
        ),
        this.assembleStore.callToActions.get(callToActionHash),
      ]),
      ([
        [commitments, cancellations, undoneCancellations],
        satisfactions,
        assemblies,
        callToAction,
      ]) => {
        const commitmentActivity: EventActivity = Array.from(
          commitments.values()
        ).map(c => ({
          type: 'commitment_created',
          record: c,
          callToAction,
        }));
        const cancellationsActivity: EventActivity = Array.from(
          cancellations.values()
        ).map(c => ({
          type: 'commitment_cancelled',
          record: c,
          commitment: commitments.get(c.entry.cancelled_hash)!,
          callToAction,
        }));

        const undoneCancellationsActivity: EventActivity = [];
        for (const uc of Array.from(undoneCancellations.values())) {
          for (const u of uc) {
            for (const r of u.undo_records) {
              const cancellation = cancellations.get(u.cancellation_hash)!;
              undoneCancellationsActivity.push({
                type: 'commitment_cancellation_undone',
                record: new EntryRecord(r),
                cancellation,
                commitment: commitments.get(cancellation.entry.cancelled_hash)!,
              });
            }
          }
        }

        const satisfactionsActivity: EventActivity = Array.from(
          satisfactions.values()
        ).map(c => ({
          type: 'satisfaction_created',
          record: c,
          callToAction,
        }));
        const assembliesActivity: EventActivity = Array.from(
          assemblies.values()
        ).map(c => ({
          type: 'assembly_created',
          record: c,
        }));

        const expiredActivity: EventActivity =
          assemblies.size === 0 &&
          !!callToAction.entry.expiration_time &&
          Date.now() * 1000 > callToAction.entry.expiration_time
            ? [
                {
                  type: 'proposal_expired',
                  timestamp: callToAction.entry.expiration_time,
                },
              ]
            : [];

        let activity: EventActivity = [
          ...commitmentActivity,
          ...cancellationsActivity,
          ...satisfactionsActivity,
          ...assembliesActivity,
          ...expiredActivity,
        ];

        activity = activity.sort(
          (r1, r2) => actionTimestamp(r2) - actionTimestamp(r1)
        );
        return activity;
      }
    )
  );

  proposalRevisionsAndCancellationsActivity = new LazyHoloHashMap<
    ActionHash,
    AsyncReadable<EventActivity>
  >((proposalHash: ActionHash) =>
    pipe(
      joinAsync([
        this.proposals.get(proposalHash),
        this.proposalRevisions.get(proposalHash),
        pipe(
          this.cancellationsStore.cancellationsFor.get(proposalHash),
          hashes => sliceAndJoin(this.cancellationsStore.cancellations, hashes)
        ),
      ]),
      ([proposal, revisions, cancellations]) => {
        let activity: EventActivity = [
          { type: 'proposal_created', record: proposal },
        ];
        const revisionsActivity: EventActivity = revisions.slice(1).map(c => ({
          type: 'proposal_updated',
          record: c,
        }));
        const cancellationsActivity: EventActivity = Array.from(
          cancellations.values()
        ).map(c => ({
          type: 'proposal_cancelled',
          record: c,
        }));

        activity = [
          ...activity,
          ...revisionsActivity,
          ...cancellationsActivity,
        ];

        activity = activity.sort(
          (r1, r2) => actionTimestamp(r2) - actionTimestamp(r1)
        );
        return activity;
      }
    )
  );

  proposalActivity = new LazyHoloHashMap<
    ActionHash,
    AsyncReadable<EventActivity>
  >((proposalHash: ActionHash) =>
    pipe(
      this.proposals.get(proposalHash),
      proposal =>
        joinAsync([
          this.proposalRevisionsAndCancellationsActivity.get(proposalHash),
          this.callToActionActivity.get(proposal.entry.call_to_action_hash),
        ]),
      ([revisionsAndCancellations, callToActionActivity]) => {
        let activity: EventActivity = [
          ...revisionsAndCancellations,
          ...callToActionActivity,
        ];

        activity = activity.sort(
          (r1, r2) => actionTimestamp(r2) - actionTimestamp(r1)
        );
        return activity;
      }
    )
  );

  eventActivity = new LazyHoloHashMap<ActionHash, AsyncReadable<EventActivity>>(
    (eventHash: ActionHash) =>
      pipe(
        this.events.get(eventHash),

        event =>
          joinAsync([
            this.eventRevisions.get(eventHash),
            pipe(
              this.cancellationsStore.cancellationsFor.get(eventHash),
              hashes =>
                sliceAndJoin(this.cancellationsStore.cancellations, hashes)
            ),
            this.callToActionActivity.get(event.entry.call_to_action_hash),
            event.entry.from_proposal
              ? this.proposalRevisionsAndCancellationsActivity.get(
                  event.entry.from_proposal.proposal_hash
                )
              : completed([]),
          ]),

        (
          [revisions, cancellations, callToActionActivity, proposalActivity],
          event
        ) => {
          let activity: EventActivity = [
            { type: 'event_created', record: event },
          ];
          const revisionsActivity: EventActivity = revisions
            .slice(1)
            .map(c => ({
              type: 'event_updated',
              record: c,
            }));
          const cancellationsActivity: EventActivity = Array.from(
            cancellations.values()
          ).map(c => ({
            type: 'event_cancelled',
            record: c,
          }));
          activity = [
            ...activity,
            ...revisionsActivity,
            ...cancellationsActivity,
            ...callToActionActivity,
            ...proposalActivity,
          ];

          activity = activity.sort(
            (r1, r2) => actionTimestamp(r2) - actionTimestamp(r1)
          );
          return activity;
        }
      )
  );

  /** Participants for Event */

  participantsForCallToAction = new LazyHoloHashMap(
    (callToActionHash: ActionHash) =>
      pipe(
        this.assembleStore.uncancelledCommitmentsForCallToAction.get(
          callToActionHash
        ),
        commitmentsHashes =>
          sliceAndJoin(this.assembleStore.commitments, commitmentsHashes),
        commitments => {
          const participants = new HoloHashMap<AgentPubKey, ActionHash>();
          const participantCommitments = Array.from(
            commitments.values()
          ).filter(c => c.entry.need_index === 0);
          for (const participantCommitment of participantCommitments) {
            participants.set(
              participantCommitment.action.author,
              participantCommitment.actionHash
            );
          }
          return participants;
        }
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
          pipe(
            this.participantsForCallToAction.get(
              event.entry.call_to_action_hash
            ),
            map => Array.from(map.keys())
          ),
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
      (p, [interestedInEvent]) => {
        const participants = new HoloHashMap<AgentPubKey, boolean>();
        const eventParticipants = p[0];

        for (const eventParticipant of interestedInEvent) {
          participants.set(eventParticipant, true);
        }

        if (p[1]) {
          for (const interestedInProposal of p[1]) {
            participants.set(interestedInProposal, true);
          }
        }

        // Remove all participants that have actually committed to go
        for (const participant of eventParticipants) {
          participants.delete(participant);
        }

        return Array.from(participants.keys());
      }
    )
  );

  interestedInProposal = new LazyHoloHashMap((proposalHash: ActionHash) =>
    lazyLoadAndPoll(() => this.client.getInterestedIn(proposalHash), 4000)
  );

  // Will contain an ordered list of the original action hashes for the upcoming events
  allUpcomingEvents: AsyncReadable<Array<IndexedHash>> = pipe(
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
        .map(e => ({
          type: 'event',
          hash: e.originalActionHash,
        }));
    }
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allCancelledEvents: AsyncReadable<Array<IndexedHash>> = pipe(
    lazyLoadAndPoll(() => this.client.getAllCancelledEvents(), 4000),
    hashes =>
      uniquify(hashes).map(hash => ({
        type: 'event',
        hash,
      }))
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allPastEvents: AsyncReadable<Array<IndexedHash>> = pipe(
    lazyLoadAndPoll(() => this.client.getAllPastEvents(), 4000),
    hashes =>
      uniquify(hashes).map(hash => ({
        type: 'event',
        hash,
      }))
  );

  async notifyOfProposalAction(
    proposalHash: ActionHash,
    action: EventActionOnlyHash
  ) {
    const participants = await toPromise(
      this.participantsForProposal.get(proposalHash)
    );
    const interested = await toPromise(
      this.interestedInProposal.get(proposalHash)
    );
    await this.alertsStore.client.notifyAlert(
      [...Array.from(participants.keys()), ...interested],
      {
        type: 'proposal_alert',
        proposalHash,
        action,
      }
    );
  }

  async notifyOfEventAction(
    eventHash: ActionHash,
    action: EventActionOnlyHash
  ) {
    const participants = await toPromise(
      this.participantsForEvent.get(eventHash)
    );
    const interested = await toPromise(this.interestedInEvent.get(eventHash));
    await this.alertsStore.client.notifyAlert(
      [...Array.from(participants.keys()), ...interested],
      {
        type: 'event_alert',
        eventHash,
        action,
      }
    );
  }

  // Will contain an ordered list of the original action hashes for the upcoming events
  allOpenProposals: AsyncReadable<Array<IndexedHash>> = pipe(
    lazyLoadAndPoll(() => this.client.getAllOpenProposals(), 4000),
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
          this.notifyOfProposalAction(proposalHash, {
            type: 'proposal_expired',
            actionHash: proposalHash,
            timestamp: proposalWithStatus.callToAction.entry.expiration_time!,
          });
        } else if (
          proposalWithStatus.status.type === 'open_proposal' ||
          proposalWithStatus.status.type === 'fulfilled_proposal'
        ) {
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
        .map(e => ({
          type: 'proposal',
          hash: e.originalActionHash,
        }));
    }
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allCancelledProposals: AsyncReadable<Array<IndexedHash>> = pipe(
    lazyLoadAndPoll(() => this.client.getAllCancelledProposals(), 4000),
    hashes => uniquify(hashes).map(hash => ({ hash, type: 'proposal' }))
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allExpiredProposals: AsyncReadable<Array<IndexedHash>> = pipe(
    lazyLoadAndPoll(() => this.client.getAllExpiredProposals(), 4000),
    hashes => uniquify(hashes).map(hash => ({ hash, type: 'proposal' }))
  );

  /** My events */

  myEvents = lazyLoadAndPoll(() => this.client.getMyEvents(), 4000);

  myPastEvents: AsyncReadable<Array<IndexedHash>> = pipe(
    joinAsync([this.myEvents, this.allPastEvents]),
    ([myEventsHashes, allPastEventsHashes]) =>
      intersection(
        myEventsHashes,
        allPastEventsHashes.map(h => h.hash)
      ).map(hash => ({
        hash,
        type: 'event',
      }))
  );

  myCancelledEvents: AsyncReadable<Array<IndexedHash>> = pipe(
    joinAsync([this.myEvents, this.allCancelledEvents]),
    ([myEventsHashes, allCancelledEventsHashes]) =>
      intersection(
        myEventsHashes,
        allCancelledEventsHashes.map(h => h.hash)
      ).map(hash => ({
        hash,
        type: 'event',
      }))
  );

  myUpcomingEvents: AsyncReadable<Array<IndexedHash>> = pipe(
    joinAsync([this.myEvents, this.allUpcomingEvents]),
    ([myEventsHashes, allUpcomingEventsHashes]) =>
      intersection(
        myEventsHashes,
        allUpcomingEventsHashes.map(h => h.hash)
      ).map(hash => ({
        hash,
        type: 'event',
      }))
  );

  myOpenProposals: AsyncReadable<Array<IndexedHash>> = pipe(
    joinAsync([this.myEvents, this.allOpenProposals]),
    ([myEventsHashes, allOpenProposalsHashes]) =>
      intersection(
        myEventsHashes,
        allOpenProposalsHashes.map(h => h.hash)
      ).map(hash => ({
        hash,
        type: 'proposal',
      }))
  );

  myExpiredProposals: AsyncReadable<Array<IndexedHash>> = pipe(
    joinAsync([this.myEvents, this.allExpiredProposals]),
    ([myEventsHashes, allExpiredProposalsHashes]) =>
      intersection(
        myEventsHashes,
        allExpiredProposalsHashes.map(h => h.hash)
      ).map(hash => ({
        hash,
        type: 'proposal',
      }))
  );

  myCancelledProposals: AsyncReadable<Array<IndexedHash>> = pipe(
    joinAsync([this.myEvents, this.allCancelledProposals]),
    ([myEventsHashes, allCancelledProposalsHashes]) =>
      intersection(
        myEventsHashes,
        allCancelledProposalsHashes.map(h => h.hash)
      ).map(hash => ({
        hash,
        type: 'proposal',
      }))
  );

  /** Aggregators */

  allUpcoming = pipe(
    joinAsync([this.allUpcomingEvents, this.allOpenProposals]),
    ([events, proposals]) => [...events, ...proposals]
  );

  allPast = pipe(
    joinAsync([this.allPastEvents, this.allExpiredProposals]),
    ([events, proposals]) => [...events, ...proposals]
  );

  allCancelled = pipe(
    joinAsync([this.allCancelledEvents, this.allCancelledProposals]),
    ([events, proposals]) => [...events, ...proposals]
  );

  myUpcoming = pipe(
    joinAsync([this.myUpcomingEvents, this.myOpenProposals]),
    ([events, proposals]) => [...events, ...proposals]
  );

  myPast = pipe(
    joinAsync([this.myPastEvents, this.myExpiredProposals]),
    ([events, proposals]) => [...events, ...proposals]
  );

  myCancelled = pipe(
    joinAsync([this.myCancelledEvents, this.myCancelledProposals]),
    ([events, proposals]) => [...events, ...proposals]
  );

  eventActionFromOnlyHash = new LazyMap(
    (actionType: EventActionTypes) =>
      new LazyHoloHashMap<ActionHash, AsyncReadable<EventAction>>(
        (actionHash: ActionHash) => {
          switch (actionType) {
            case 'proposal_created':
              return pipe(this.proposals.get(actionHash), proposal => ({
                type: 'proposal_created',
                record: proposal,
              }));
            case 'proposal_updated':
              return pipe(this.proposals.get(actionHash), proposal => ({
                type: 'proposal_updated',
                record: proposal,
              }));
            case 'proposal_cancelled':
              return pipe(
                this.assembleStore.cancellationsStore.cancellations.get(
                  actionHash
                ),
                cancellations => ({
                  type: 'proposal_cancelled',
                  record: cancellations,
                })
              );
            case 'proposal_expired':
              return pipe(
                this.proposals.get(actionHash),
                proposal =>
                  this.assembleStore.callToActions.get(
                    proposal.entry.call_to_action_hash
                  ),
                callToAction => ({
                  type: 'proposal_expired',
                  timestamp: callToAction.entry.expiration_time!,
                })
              );
            case 'event_created':
              return pipe(this.events.get(actionHash), event => ({
                type: 'event_created',
                record: event,
              }));
            case 'event_updated':
              return pipe(this.events.get(actionHash), event => ({
                type: 'event_updated',
                record: event,
              }));
            case 'event_cancelled':
              return pipe(
                this.assembleStore.cancellationsStore.cancellations.get(
                  actionHash
                ),
                cancellations => ({
                  type: 'event_cancelled',
                  record: cancellations,
                })
              );
            case 'commitment_created':
              return pipe(
                this.assembleStore.commitments.get(actionHash),
                commitment =>
                  this.assembleStore.callToActions.get(
                    commitment.entry.call_to_action_hash
                  ),
                (callToAction, commitment) => ({
                  type: 'commitment_created',
                  record: commitment,
                  callToAction,
                })
              );
            case 'commitment_cancelled':
              return pipe(
                this.assembleStore.cancellationsStore.cancellations.get(
                  actionHash
                ),
                cancellation =>
                  this.assembleStore.commitments.get(
                    cancellation.entry.cancelled_hash
                  ),
                commitment =>
                  this.assembleStore.callToActions.get(
                    commitment.entry.call_to_action_hash
                  ),
                (callToAction, commitment, cancellation) => ({
                  type: 'commitment_cancelled',
                  record: cancellation,
                  commitment,
                  callToAction,
                })
              );
            case 'satisfaction_created':
              return pipe(
                this.assembleStore.satisfactions.get(actionHash),
                satisfaction =>
                  this.assembleStore.callToActions.get(
                    satisfaction!.entry.call_to_action_hash
                  ),
                (callToAction, satisfaction) => ({
                  type: 'satisfaction_created',
                  record: satisfaction!,
                  callToAction,
                })
              );
            case 'satisfaction_deleted':
              console.log('hey');
              return pipe(
                this.assembleStore.satisfactions.get(actionHash), // TODO: remove this hack
                deleteAction => {
                  console.log(deleteAction);
                  return this.assembleStore.satisfactions.get(
                    (deleteAction!.action as DeleteLink).link_add_address
                  );
                },
                createLinkRecord =>
                  this.assembleStore.satisfactions.get(
                    (createLinkRecord!.action as CreateLink).target_address
                  ),

                satisfaction =>
                  this.assembleStore.callToActions.get(
                    satisfaction!.entry.call_to_action_hash
                  ),
                (callToAction, satisfaction, _, deleteAction) => {
                  console.log('aaaa');
                  return {
                    type: 'satisfaction_deleted',
                    record: deleteAction as unknown as EntryRecord<void>,
                    satisfaction: satisfaction!,
                    callToAction,
                  };
                }
              );
            case 'assembly_created':
              return pipe(
                this.assembleStore.assemblies.get(actionHash),
                assembly => ({
                  type: 'assembly_created',
                  record: assembly!,
                })
              );
          }
          throw new Error('Action not supported yet');
        }
      )
  );

  unreadAlerts = pipe(
    this.alertsStore.unreadAlerts,
    alerts => {
      return [...alerts].sort((a1, a2) => a2.timestamp - a1.timestamp);
    },
    unreadAlerts => {
      const eventsHashes = unreadAlerts
        .filter(a => a.alert.type === 'event_alert')
        .map(a => (a.alert as any).eventHash);
      const proposalsHashes = unreadAlerts
        .filter(a => a.alert.type === 'proposal_alert')
        .map(a => (a.alert as any).proposalHash);

      const actions = unreadAlerts.map(ua =>
        this.eventActionFromOnlyHash
          .get(ua.alert.action.type)
          .get(ua.alert.action.actionHash)
      );

      return joinAsync([
        sliceAndJoin(this.eventsStatus, eventsHashes),
        sliceAndJoin(this.proposalsStatus, proposalsHashes),
        joinAsync(actions),
      ]);
    },
    ([events, proposals, actions], alerts) =>
      [alerts, actions, events, proposals] as [
        Array<Alert<GatherAlert>>,
        EventAction[],
        ReadonlyMap<ActionHash, EventWithStatus>,
        ReadonlyMap<ActionHash, ProposalWithStatus>
      ]
  );

  readAlerts = pipe(
    this.alertsStore.readAlerts,
    alerts => {
      return [...alerts].sort((a1, a2) => a2.timestamp - a1.timestamp);
    },
    readAlerts => {
      const eventsHashes = readAlerts
        .filter(a => a.alert.type === 'event_alert')
        .map(a => (a.alert as any).eventHash);
      const proposalsHashes = readAlerts
        .filter(a => a.alert.type === 'proposal_alert')
        .map(a => (a.alert as any).proposalHash);

      const actions = readAlerts.map(ua =>
        this.eventActionFromOnlyHash
          .get(ua.alert.action.type)
          .get(ua.alert.action.actionHash)
      );

      return joinAsync([
        sliceAndJoin(this.eventsStatus, eventsHashes),
        sliceAndJoin(this.proposalsStatus, proposalsHashes),
        joinAsync(actions),
      ]);
    },
    ([events, proposals, actions], alerts) =>
      [alerts, actions, events, proposals] as [
        Array<Alert<GatherAlert>>,
        EventAction[],
        ReadonlyMap<ActionHash, EventWithStatus>,
        ReadonlyMap<ActionHash, ProposalWithStatus>
      ]
  );
}
