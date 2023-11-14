import { AssembleStore, CallToAction, Commitment } from '@darksoil/assemble';
import {
  allRevisionsOfEntryStore,
  AsyncReadable,
  collectionStore,
  completed,
  immutableEntryStore,
  joinAsync,
  latestVersionOfEntryStore,
  liveLinksAgentPubKeysTargetsStore,
  liveLinksTargetsStore,
  mapAndJoin,
  pipe,
  sliceAndJoin,
  toPromise,
} from '@holochain-open-dev/stores';
import {
  EntryRecord,
  LazyHoloHashMap,
  HoloHashMap,
  LazyMap,
  slice,
} from '@holochain-open-dev/utils';
import {
  Cancellation,
  CancellationsStore,
} from '@holochain-open-dev/cancellations';
import {
  ActionHash,
  AgentPubKey,
  CreateLink,
  DeleteLink,
  SignedActionHashed,
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
import { intersection, isPast } from './utils.js';
import { AlertsStore } from '../../alerts/alerts-store.js';
import { Alert } from '../../alerts/alerts-client.js';
import {
  actionTimestamp,
  EventAction,
  EventActionOnlyHash,
  EventActionTypes,
  EventActivity,
} from './activity.js';

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
  if (cancellations.length > 0) return { type: 'cancelled_proposal' };
  if (assemblies.length > 0)
    return {
      type: 'fulfilled_proposal',
      assemblyHash: assemblies[0],
    };
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
          await alertsStore.client.notifyAlert(
            signal.app_entry.hosts.filter(
              host => host.toString() !== this.client.client.myPubKey.toString()
            ),
            {
              type: 'proposal_alert',
              proposalHash: signal.action.hashed.hash,
              action: {
                type: 'proposal_created',
                actionHash: signal.action.hashed.hash,
              },
            }
          );
        } else if (signal.app_entry.type === 'Event') {
          if (signal.app_entry.from_proposal) {
            const proposal = this.proposals.get(
              signal.app_entry.from_proposal.proposal_hash
            );
            const participants = await toPromise(proposal.participants);
            const interested = await toPromise(proposal.interested);
            await alertsStore.client.notifyAlert(
              [
                ...Array.from(participants.keys()),
                ...interested,
                ...signal.app_entry.hosts,
              ].filter(
                agent =>
                  agent.toString() !== this.client.client.myPubKey.toString()
              ),
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
              await this.client.getLatestEvent(lastUpdate);
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
            ).latestVersion
          );
          const allOpenProposals = await toPromise(
            mapAndJoin(
              slice(
                this.proposals,
                (await toPromise(this.allOpenProposals)).map(h => h.hash)
              ),
              p => p.latestVersion
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
                const proposalStore = this.proposals.get(proposalHash);
                const participants = await toPromise(
                  proposalStore.participants
                );
                const interested = await toPromise(proposalStore.interested);
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
            ).latestVersion
          );
          const allOpenProposals = await toPromise(
            mapAndJoin(
              slice(
                this.proposals,
                (await toPromise(this.allOpenProposals)).map(h => h.hash)
              ),
              p => p.latestVersion
            )
          );

          for (const [proposalHash, proposal] of allOpenProposals) {
            if (
              proposal.entry.call_to_action_hash.toString() ===
              callToAction.actionHash.toString()
            ) {
              const proposalStore = this.proposals.get(proposalHash);
              const participants = await toPromise(proposalStore.participants);
              const interested = await toPromise(proposalStore.interested);
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
            ).latestVersion
          );
          const allOpenProposals = await toPromise(
            mapAndJoin(
              slice(
                this.proposals,
                (await toPromise(this.allOpenProposals)).map(h => h.hash)
              ),
              p => p.latestVersion
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
            mapAndJoin(
              slice(
                this.events,
                (await toPromise(this.allUpcomingEvents)).map(h => h.hash)
              ),
              e => e.latestVersion,
              {
                errors: 'filter_out',
              }
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
            const eventStore = this.events.get(cancelledHash);
            const event = await toPromise(eventStore.latestVersion);
            if ('from_proposal' in event.entry) {
              await this.client.markEventAsCancelled(cancelledHash);
              const participants = await toPromise(eventStore.participants);
              const interested = await toPromise(eventStore.interested);
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
            const proposalStore = this.proposals.get(cancelledHash);
            const proposal = await toPromise(proposalStore.latestVersion);
            if ('hosts' in proposal.entry) {
              await this.client.markProposalAsCancelled(cancelledHash);
              const participants = await toPromise(proposalStore.participants);
              const interested = await toPromise(proposalStore.interested);
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
              this.assembleStore.commitments.get(cancelledHash).entry
            );
            if (!commitment.entry.amount) return;
            if (commitment.entry.need_index === 0) {
              const myEventsHashes = await toPromise(this.myEvents);

              for (const eventHash of myEventsHashes) {
                const event = await toPromise(
                  this.events.get(eventHash).latestVersion
                );
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

          const cancelledHash = signal.original_app_entry.cancelled_hash;
          try {
            const eventStore = this.events.get(cancelledHash);
            const event = await toPromise(eventStore.latestVersion);
            if ('from_proposal' in event.entry) {
              await this.client.markEventAsUpcoming(cancelledHash);
              await this.notifyOfEventAction(cancelledHash, {
                type: 'event_uncancelled',
                actionHash: signal.action.hashed.content.deletes_address,
              });
              return;
            }
          } catch (e) {
            console.log(e);
          }
          try {
            const proposalStore = this.proposals.get(cancelledHash);
            const proposal = await toPromise(proposalStore.latestVersion);
            if ('hosts' in proposal.entry) {
              await this.client.markProposalAsOpen(cancelledHash);
              await this.notifyOfProposalAction(cancelledHash, {
                type: 'proposal_uncancelled',
                actionHash: signal.action.hashed.content.deletes_address,
              });
              return;
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    });
  }

  /** Event */

  events = new LazyHoloHashMap((eventHash: ActionHash) => {
    const latestVersion = latestVersionOfEntryStore(this.client, () =>
      this.client.getLatestEvent(eventHash)
    );
    const liveCancellations =
      this.cancellationsStore.cancellationsFor.get(eventHash).live;
    return {
      latestVersion,
      originalEntry: immutableEntryStore(() =>
        this.client.getOriginalEvent(eventHash)
      ),
      status: pipe(
        joinAsync([latestVersion, liveCancellations]),
        ([event, cancellations]) => ({
          originalActionHash: eventHash,
          currentEvent: event,
          status: deriveStatus(event, Array.from(cancellations.keys())),
        })
      ),
      allRevisions: allRevisionsOfEntryStore(this.client, () =>
        this.client.getAllEventRevisions(eventHash)
      ),
      participants: pipe(latestVersion, event =>
        this.participantsForCallToAction.get(event.entry.call_to_action_hash)
      ),
      interested: pipe(
        joinAsync([
          liveLinksAgentPubKeysTargetsStore(
            this.client,
            eventHash,
            () => this.client.getInterestedIn(eventHash),
            'Interested'
          ),
          latestVersion,
        ]),
        ([_interestedInEvent, event]) => {
          const stores: Array<AsyncReadable<AgentPubKey[]>> = [
            pipe(
              this.participantsForCallToAction.get(
                event.entry.call_to_action_hash
              ),
              map => Array.from(map.keys())
            ),
          ];
          if (event.entry.from_proposal) {
            stores.push(
              this.proposals.get(event.entry.from_proposal.proposal_hash)
                .interested
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
      ),
      cancellations: this.cancellationsStore.cancellationsFor.get(eventHash),
      callToAction: pipe(latestVersion, e =>
        this.assembleStore.callToActions.get(e.entry.call_to_action_hash)
      ),
    };
  });

  proposals = new LazyHoloHashMap((proposalHash: ActionHash) => {
    const latestVersion = latestVersionOfEntryStore(this.client, () =>
      this.client.getLatestProposal(proposalHash)
    );
    const liveCancellationsHashes =
      this.cancellationsStore.cancellationsFor.get(proposalHash).live;
    const events = liveLinksTargetsStore(
      this.client,
      proposalHash,
      () => this.client.getEventsForProposal(proposalHash),
      'ProposalToEvents'
    );
    return {
      latestVersion,
      originalEntry: immutableEntryStore(() =>
        this.client.getOriginalProposal(proposalHash)
      ),
      status: pipe(
        joinAsync([latestVersion, liveCancellationsHashes, events]),
        ([proposal]) =>
          joinAsync([
            this.assembleStore.callToActions.get(
              proposal.entry.call_to_action_hash
            ).latestVersion,

            this.assembleStore.callToActions.get(
              proposal.entry.call_to_action_hash
            ).assemblies,
          ]),
        (
          [callToAction, assemblies],
          [proposal, cancellations, eventsHashes]
        ) => ({
          originalActionHash: proposalHash,
          currentProposal: proposal,
          status: deriveProposalStatus(
            proposal,
            Array.from(cancellations.keys()),
            callToAction,
            Array.from(assemblies.keys()),
            eventsHashes
          ),
          callToAction,
        })
      ),
      allRevisions: allRevisionsOfEntryStore(this.client, () =>
        this.client.getAllProposalRevisions(proposalHash)
      ),
      interested: liveLinksAgentPubKeysTargetsStore(
        this.client,
        proposalHash,
        () => this.client.getInterestedIn(proposalHash),
        'Interested'
      ),
      participants: pipe(latestVersion, proposal =>
        this.participantsForCallToAction.get(proposal.entry.call_to_action_hash)
      ),
      cancellations: this.cancellationsStore.cancellationsFor.get(proposalHash),
    };
  });

  commitmentActivity = new LazyHoloHashMap<
    ActionHash,
    AsyncReadable<EventActivity>
  >(commitmentHash =>
    pipe(
      joinAsync([
        pipe(
          this.assembleStore.commitments.get(commitmentHash).entry,
          c =>
            this.assembleStore.callToActions.get(c.entry.call_to_action_hash)
              .latestVersion,
          (callToAction, commitment) => ({
            callToAction,
            commitment,
          })
        ),
        pipe(
          this.assembleStore.commitments.get(commitmentHash).cancellations.live,
          liveCancellations =>
            mapAndJoin(liveCancellations, c => c.latestVersion)
        ),
        pipe(
          this.assembleStore.commitments.get(commitmentHash).cancellations
            .undone,
          undoneCancellations =>
            mapAndJoin(undoneCancellations, c =>
              joinAsync([c.latestVersion, c.deletes])
            )
        ),
      ]),
      ([commitment, cancellations, undoneCancellations]) => {
        const commitmentActivity: EventActivity = [
          {
            type: 'commitment_created',
            record: commitment.commitment,
            callToAction: commitment.callToAction,
          },
        ];
        const cancellationsActivity: EventActivity = Array.from(
          cancellations.values()
        ).map(c => ({
          type: 'commitment_cancelled',
          record: c,
          commitment: commitment.commitment,
          callToAction: commitment.callToAction,
        }));

        const undoneCancellationsActivity: EventActivity = [];
        for (const uc of Array.from(undoneCancellations.values())) {
          for (const r of uc[1]) {
            undoneCancellationsActivity.push({
              type: 'commitment_cancellation_undone',
              record: new EntryRecord({
                signed_action: r,
                entry: {
                  NotApplicable: undefined,
                },
              }),
              cancellation: uc[0],
              commitment: commitment.commitment,
            });
          }
        }
        return [
          ...commitmentActivity,
          ...cancellationsActivity,
          ...undoneCancellationsActivity,
        ];
      }
    )
  );

  callToActionActivity = new LazyHoloHashMap<
    ActionHash,
    AsyncReadable<EventActivity>
  >((callToActionHash: ActionHash) =>
    pipe(
      joinAsync([
        pipe(
          joinAsync([
            this.assembleStore.callToActions.get(callToActionHash).commitments
              .cancelled,
            this.assembleStore.callToActions.get(callToActionHash).commitments
              .uncancelled,
          ]),
          ([cancelledCommitments, uncancelledCommitments]) =>
            sliceAndJoin(this.commitmentActivity, [
              ...Array.from(cancelledCommitments.keys()),
              ...Array.from(uncancelledCommitments.keys()),
            ])
        ),
        pipe(
          this.assembleStore.callToActions.get(callToActionHash).satisfactions,
          satisfactions => mapAndJoin(satisfactions, s => s.latestVersion)
        ),
        pipe(
          this.assembleStore.callToActions.get(callToActionHash).assemblies,
          assemblies => mapAndJoin(assemblies, s => s)
        ),
        this.assembleStore.callToActions.get(callToActionHash).latestVersion,
      ]),
      ([commitmentsActivity, satisfactions, assemblies, callToAction]) => {
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
          ...satisfactionsActivity,
          ...assembliesActivity,
          ...expiredActivity,
        ];
        for (const [_, commitmentActivity] of commitmentsActivity.entries()) {
          activity = [...activity, ...commitmentActivity];
        }

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
        this.proposals.get(proposalHash).latestVersion,
        this.proposals.get(proposalHash).allRevisions,
        pipe(this.proposals.get(proposalHash).cancellations.live, map =>
          mapAndJoin(map, c => c.latestVersion)
        ),
        pipe(this.proposals.get(proposalHash).cancellations.undone, map =>
          mapAndJoin(map, c => joinAsync([c.latestVersion, c.deletes]))
        ),
      ]),
      ([proposal, revisions, liveCancellations, undoneCancellations]) => {
        let activity: EventActivity = [
          { type: 'proposal_created', record: proposal },
        ];
        const revisionsActivity: EventActivity = revisions.slice(1).map(c => ({
          type: 'proposal_updated',
          record: c,
        }));
        const cancellationsActivity: EventActivity = Array.from(
          liveCancellations.values()
        ).map(c => ({
          type: 'proposal_cancelled',
          record: c,
        }));
        let undoneCancellationsActivity: EventActivity = [];
        for (const [
          cancellation,
          undoneRecords,
        ] of undoneCancellations.values()) {
          undoneCancellationsActivity = undoneCancellationsActivity.concat([
            {
              type: 'proposal_cancelled',
              record: cancellation,
            },
            ...undoneRecords.map(
              deleteAction =>
                ({
                  type: 'proposal_uncancelled',
                  record: new EntryRecord({
                    signed_action: deleteAction,
                    entry: {
                      NotApplicable: undefined,
                    },
                  }),
                  proposal,
                } as EventAction)
            ),
          ]);
        }

        activity = [
          ...activity,
          ...revisionsActivity,
          ...cancellationsActivity,
          ...undoneCancellationsActivity,
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
      this.proposals.get(proposalHash).latestVersion,
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
        this.events.get(eventHash).latestVersion,

        event =>
          joinAsync([
            this.events.get(eventHash).allRevisions,
            pipe(this.events.get(eventHash).cancellations.live, map =>
              mapAndJoin(map, c => c.latestVersion)
            ),
            pipe(this.events.get(eventHash).cancellations.undone, map =>
              mapAndJoin(map, c => joinAsync([c.latestVersion, c.deletes]))
            ),
            this.callToActionActivity.get(event.entry.call_to_action_hash),
            event.entry.from_proposal
              ? this.proposalRevisionsAndCancellationsActivity.get(
                  event.entry.from_proposal.proposal_hash
                )
              : completed([]),
          ]),

        (
          [
            revisions,
            cancellations,
            undoneCancellations,
            callToActionActivity,
            proposalActivity,
          ],
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

          let undoneCancellationsActivity: EventActivity = [];
          for (const [
            cancellation,
            undoneRecords,
          ] of undoneCancellations.values()) {
            undoneCancellationsActivity = undoneCancellationsActivity.concat([
              {
                type: 'event_cancelled',
                record: cancellation,
              },
              ...undoneRecords.map(
                deleteAction =>
                  ({
                    type: 'event_uncancelled',
                    record: new EntryRecord({
                      signed_action: deleteAction,
                      entry: {
                        NotApplicable: undefined,
                      },
                    }),
                    event,
                  } as EventAction)
              ),
            ]);
          }
          activity = [
            ...activity,
            ...revisionsActivity,
            ...cancellationsActivity,
            ...callToActionActivity,
            ...proposalActivity,
            ...undoneCancellationsActivity,
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
        this.assembleStore.callToActions.get(callToActionHash).commitments
          .uncancelled,
        commitments => mapAndJoin(commitments, c => c.entry),
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

  // Will contain an ordered list of the original action hashes for the upcoming events
  allUpcomingEvents: AsyncReadable<Array<IndexedHash>> = pipe(
    collectionStore(
      this.client,
      () => this.client.getAllUpcomingEvents(),
      'UpcomingEvents'
    ),
    upcomingEventsHashes =>
      mapAndJoin(slice(this.events, upcomingEventsHashes), e => e.status, {
        errors: 'filter_out',
      }),
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
    collectionStore(
      this.client,
      () => this.client.getAllCancelledEvents(),
      'CancelledEvents'
    ),
    hashes =>
      hashes.map(hash => ({
        type: 'event',
        hash,
      }))
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allPastEvents: AsyncReadable<Array<IndexedHash>> = pipe(
    collectionStore(
      this.client,
      () => this.client.getAllPastEvents(),
      'PastEvents'
    ),
    hashes =>
      hashes.map(hash => ({
        type: 'event',
        hash,
      }))
  );

  async notifyOfProposalAction(
    proposalHash: ActionHash,
    action: EventActionOnlyHash
  ) {
    const proposal = this.proposals.get(proposalHash);
    const participants = await toPromise(proposal.participants);
    const interested = await toPromise(proposal.interested);
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
    const event = this.events.get(eventHash);
    const participants = await toPromise(event.participants);
    const interested = await toPromise(event.interested);
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
    collectionStore(
      this.client,
      () => this.client.getAllOpenProposals(),
      'OpenProposals'
    ),
    openProposalsHashes =>
      mapAndJoin(slice(this.proposals, openProposalsHashes), p => p.status, {
        errors: 'filter_out',
      }),
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
    collectionStore(
      this.client,
      () => this.client.getAllCancelledProposals(),
      'CancelledProposals'
    ),
    hashes => hashes.map(hash => ({ hash, type: 'proposal' }))
  );

  // Will contain an ordered list of the original action hashes for the cancelled events
  allExpiredProposals: AsyncReadable<Array<IndexedHash>> = pipe(
    collectionStore(
      this.client,
      () => this.client.getAllExpiredProposals(),
      'ExpiredProposals'
    ),
    hashes => hashes.map(hash => ({ hash, type: 'proposal' }))
  );

  /** My events */

  myEvents = collectionStore(
    this.client,
    () => this.client.getMyEvents(),
    'MyEvents'
  );

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
              return pipe(
                this.proposals.get(actionHash).originalEntry,
                proposal => ({
                  type: 'proposal_created',
                  record: proposal,
                })
              );
            case 'proposal_updated':
              return pipe(
                this.proposals.get(actionHash).latestVersion,
                proposal => ({
                  type: 'proposal_updated',
                  record: proposal,
                })
              );
            case 'proposal_cancelled':
              return pipe(
                this.assembleStore.cancellationsStore.cancellations.get(
                  actionHash
                ).originalEntry,
                cancellation => ({
                  type: 'proposal_cancelled',
                  record: cancellation,
                })
              );
            case 'proposal_uncancelled':
              return pipe(
                this.assembleStore.cancellationsStore.cancellations.get(
                  actionHash
                ).deletes,
                deletes =>
                  this.proposals.get(deletes[0].hashed.content.deletes_address)
                    .latestVersion,
                (proposal, deletes) => ({
                  type: 'proposal_uncancelled',
                  record: new EntryRecord<void>({
                    signed_action: deletes[0],
                    entry: {
                      NotApplicable: undefined,
                    },
                  }),
                  proposal,
                })
              );
            case 'proposal_expired':
              return pipe(
                this.proposals.get(actionHash).latestVersion,
                proposal =>
                  this.assembleStore.callToActions.get(
                    proposal.entry.call_to_action_hash
                  ).latestVersion,
                callToAction => ({
                  type: 'proposal_expired',
                  timestamp: callToAction.entry.expiration_time!,
                })
              );
            case 'event_created':
              return pipe(this.events.get(actionHash).originalEntry, event => ({
                type: 'event_created',
                record: event,
              }));
            case 'event_updated':
              return pipe(
                this.events.get(actionHash).originalEntry, // TODO: this is a bit hacky, since we are treating an update for an event as if it was the original create, but it should work
                event => ({
                  type: 'event_updated',
                  record: event,
                })
              );
            case 'event_cancelled':
              return pipe(
                this.assembleStore.cancellationsStore.cancellations.get(
                  actionHash
                ).originalEntry,
                cancellations => ({
                  type: 'event_cancelled',
                  record: cancellations,
                })
              );
            case 'event_uncancelled':
              return pipe(
                this.assembleStore.cancellationsStore.cancellations.get(
                  actionHash
                ).deletes,
                deletes =>
                  this.events.get(deletes[0].hashed.content.deletes_address)
                    .latestVersion,
                (event, deletes) => ({
                  type: 'event_uncancelled',
                  record: new EntryRecord<void>({
                    signed_action: deletes[0],
                    entry: {
                      NotApplicable: undefined,
                    },
                  }),
                  event,
                })
              );
            case 'commitment_created':
              return pipe(
                this.assembleStore.commitments.get(actionHash).entry,
                commitment =>
                  this.assembleStore.callToActions.get(
                    commitment.entry.call_to_action_hash
                  ).latestVersion,
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
                ).originalEntry,
                cancellation =>
                  this.assembleStore.commitments.get(
                    cancellation.entry.cancelled_hash
                  ).entry,
                commitment =>
                  this.assembleStore.callToActions.get(
                    commitment.entry.call_to_action_hash
                  ).latestVersion,
                (callToAction, commitment, cancellation) => ({
                  type: 'commitment_cancelled',
                  record: cancellation,
                  commitment,
                  callToAction,
                })
              );
            case 'satisfaction_created':
              return pipe(
                this.assembleStore.satisfactions.get(actionHash).latestVersion, // TODO: maybe add original entry here?
                satisfaction =>
                  this.assembleStore.callToActions.get(
                    satisfaction!.entry.call_to_action_hash
                  ).latestVersion,
                (callToAction, satisfaction) => ({
                  type: 'satisfaction_created',
                  record: satisfaction!,
                  callToAction,
                })
              );
            case 'satisfaction_deleted':
              return pipe(
                this.assembleStore.satisfactions.get(actionHash).latestVersion, // TODO: remove this hack
                deleteAction =>
                  this.assembleStore.satisfactions.get(
                    (deleteAction!.action as DeleteLink).link_add_address
                  ).latestVersion,
                createLinkRecord =>
                  this.assembleStore.satisfactions.get(
                    (createLinkRecord!.action as CreateLink).target_address
                  ).latestVersion,
                satisfaction =>
                  this.assembleStore.callToActions.get(
                    satisfaction!.entry.call_to_action_hash
                  ).latestVersion,
                (callToAction, satisfaction, _, deleteAction) => ({
                  type: 'satisfaction_deleted',
                  record: deleteAction as unknown as EntryRecord<void>,
                  satisfaction: satisfaction!,
                  callToAction,
                })
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
        mapAndJoin(slice(this.events, eventsHashes), e => e.status),
        mapAndJoin(slice(this.proposals, proposalsHashes), p => p.status),
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
        mapAndJoin(slice(this.events, eventsHashes), e => e.status),
        mapAndJoin(slice(this.proposals, proposalsHashes), p => p.status),
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
