import { EntryRecord, ZomeClient } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppAgentClient,
  CreateLink,
  Record,
  SignedActionHashed,
} from '@holochain/client';

import { Proposal, Event, GatherSignal } from './types';

export interface GetEventOutput {
  event: EntryRecord<Event>;
  deletes: SignedActionHashed[];
}

export class GatherClient extends ZomeClient<GatherSignal> {
  constructor(
    public client: AppAgentClient,
    public roleName: string,
    public zomeName = 'gather'
  ) {
    super(client, roleName, zomeName);
  }
  /** Event */

  async createEvent(event: Event): Promise<EntryRecord<Event>> {
    const record = await this.callZome('create_event', event);
    return new EntryRecord(record);
  }

  async getLatestEvent(
    eventHash: ActionHash
  ): Promise<EntryRecord<Event> | undefined> {
    const output: any | undefined = await this.callZome(
      'get_latest_event',
      eventHash
    );
    if (!output) return undefined;

    return new EntryRecord(output);
  }

  async getOriginalEvent(
    eventHash: ActionHash
  ): Promise<EntryRecord<Event> | undefined> {
    const output: any | undefined = await this.callZome(
      'get_original_event',
      eventHash
    );
    if (!output) return undefined;

    return new EntryRecord(output);
  }

  async getAllEventRevisions(
    eventHash: ActionHash
  ): Promise<Array<EntryRecord<Event>>> {
    const records: Record[] = await this.callZome(
      'get_all_event_revisions',
      eventHash
    );

    return records.map(r => new EntryRecord(r));
  }

  async updateEvent(
    originalEventHash: ActionHash,
    previousEventHash: ActionHash,
    updatedEvent: Event
  ): Promise<EntryRecord<Event>> {
    const record = await this.callZome('update_event', {
      original_event_hash: originalEventHash,
      previous_event_hash: previousEventHash,
      updated_event: updatedEvent,
    });
    return new EntryRecord(record);
  }

  /** Proposal */

  async createProposal(proposal: Proposal): Promise<EntryRecord<Proposal>> {
    const record = await this.callZome('create_proposal', proposal);

    return new EntryRecord(record);
  }

  async getLatestProposal(
    proposalHash: ActionHash
  ): Promise<EntryRecord<Proposal> | undefined> {
    const output: any | undefined = await this.callZome(
      'get_latest_proposal',
      proposalHash
    );
    if (!output) return undefined;

    return new EntryRecord(output);
  }

  async getOriginalProposal(
    proposalHash: ActionHash
  ): Promise<EntryRecord<Proposal> | undefined> {
    const output: any | undefined = await this.callZome(
      'get_original_proposal',
      proposalHash
    );
    if (!output) return undefined;

    return new EntryRecord(output);
  }

  async getAllProposalRevisions(
    proposalHash: ActionHash
  ): Promise<Array<EntryRecord<Proposal>>> {
    const records: Record[] = await this.callZome(
      'get_all_proposal_revisions',
      proposalHash
    );

    return records.map(r => new EntryRecord(r));
  }

  async updateProposal(
    originalProposalHash: ActionHash,
    previousProposalHash: ActionHash,
    updatedProposal: Proposal
  ): Promise<EntryRecord<Proposal>> {
    const record = await this.callZome('update_proposal', {
      original_proposal_hash: originalProposalHash,
      previous_proposal_hash: previousProposalHash,
      updated_proposal: updatedProposal,
    });
    return new EntryRecord(record);
  }

  getEventsForProposal(proposalHash: ActionHash): Promise<Array<ActionHash>> {
    return this.callZome('get_events_for_proposal', proposalHash);
  }

  /** All Events */

  markEventAsUpcoming(eventHash: ActionHash): Promise<void> {
    return this.callZome('mark_event_as_upcoming', eventHash);
  }

  markEventAsCancelled(eventHash: ActionHash): Promise<void> {
    return this.callZome('mark_event_as_cancelled', eventHash);
  }

  markEventAsPast(eventHash: ActionHash): Promise<void> {
    return this.callZome('mark_event_as_past', eventHash);
  }

  getAllUpcomingEvents(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_upcoming_events', null);
  }

  getAllCancelledEvents(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_cancelled_events', null);
  }

  getAllPastEvents(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_past_events', null);
  }

  /** All Proposals */

  markProposalAsExpired(proposalHash: ActionHash): Promise<void> {
    return this.callZome('mark_proposal_as_expired', proposalHash);
  }

  markProposalAsCancelled(proposalHash: ActionHash): Promise<void> {
    return this.callZome('mark_proposal_as_cancelled', proposalHash);
  }

  async getAllOpenProposals(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_open_proposals', null);
  }

  getAllCancelledProposals(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_cancelled_proposals', null);
  }

  getAllExpiredProposals(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_expired_proposals', null);
  }

  /** My Events  */

  async getMyEvents(): Promise<Array<ActionHash>> {
    return this.callZome('get_my_events', null);
  }

  async addToMyEvents(eventOrProposalHash: ActionHash): Promise<void> {
    return this.callZome('add_to_my_events', eventOrProposalHash);
  }

  async removeFromMyEvents(eventOrProposalHash: ActionHash): Promise<void> {
    return this.callZome('remove_from_my_events', eventOrProposalHash);
  }

  /** Interested */

  async getInterestedIn(
    eventOrProposalHash: ActionHash
  ): Promise<Array<AgentPubKey>> {
    return this.callZome('get_interested_in', eventOrProposalHash);
  }

  async addMyselfAsInterested(eventOrProposalHash: ActionHash): Promise<void> {
    return this.callZome('add_myself_as_interested', eventOrProposalHash);
  }

  async removeMyselfAsInterested(
    eventOrProposalHash: ActionHash
  ): Promise<void> {
    return this.callZome('remove_myself_as_interested', eventOrProposalHash);
  }
}
