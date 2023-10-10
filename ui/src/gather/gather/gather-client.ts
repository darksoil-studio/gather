import { Cancellation } from './types';

import { EntryRecord, ZomeClient } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppAgentClient,
  CreateLink,
  Record,
  SignedActionHashed,
} from '@holochain/client';

import { Event, GatherSignal } from './types';

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

  async createEventProposal(event: Event): Promise<EntryRecord<Event>> {
    const record = await this.callZome('create_event_proposal', event);

    return new EntryRecord(record);
  }

  async getEvent(
    eventHash: ActionHash
  ): Promise<EntryRecord<Event> | undefined> {
    const output: any | undefined = await this.callZome('get_event', eventHash);
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

  updateEvent(
    originalEventHash: ActionHash,
    previousEventHash: ActionHash,
    updatedEvent: Event
  ): Promise<Record> {
    return this.callZome('update_event', {
      original_event_hash: originalEventHash,
      previous_event_hash: previousEventHash,
      updated_event: updatedEvent,
    });
  }

  /** Participants for Event */

  /** All Events */

  markEventPast(eventHash: ActionHash): Promise<void> {
    return this.callZome('mark_event_past', eventHash);
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

  /** All Events */

  markEventProposalExpired(eventHash: ActionHash): Promise<void> {
    return this.callZome('mark_event_proposal_expired', eventHash);
  }

  markEventProposalFulfilled(eventHash: ActionHash): Promise<void> {
    return this.callZome('mark_event_proposal_fulfilled', eventHash);
  }

  async getAllOpenEventProposals(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_open_event_proposals', null);
  }

  getAllCancelledEventProposals(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_cancelled_event_proposals', null);
  }

  getAllExpiredEventProposals(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_expired_event_proposals', null);
  }

  /** My Events  */

  async getMyEvents(): Promise<Array<ActionHash>> {
    return this.callZome('get_my_events', null);
  }

  /** Cancellation */

  async cancelEvent(
    eventHash: ActionHash,
    reason: string
  ): Promise<EntryRecord<Cancellation>> {
    const record: Record = await this.callZome('cancel_event', {
      event_hash: eventHash,
      reason,
    });
    return new EntryRecord(record);
  }

  async getCancellation(
    cancellationHash: ActionHash
  ): Promise<EntryRecord<Cancellation> | undefined> {
    const record: Record = await this.callZome(
      'get_cancellation',
      cancellationHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  deleteCancellation(
    originalCancellationHash: ActionHash
  ): Promise<ActionHash> {
    return this.callZome('delete_cancellation', originalCancellationHash);
  }

  async updateCancellation(
    previousCancellationHash: ActionHash,
    updatedCancellation: Cancellation
  ): Promise<EntryRecord<Cancellation>> {
    const record: Record = await this.callZome('update_cancellation', {
      previous_cancellation_hash: previousCancellationHash,
      updated_cancellation: updatedCancellation,
    });
    return new EntryRecord(record);
  }

  async getCancellationsForEvent(
    eventHash: ActionHash
  ): Promise<Array<EntryRecord<Cancellation>>> {
    const records: Record[] = await this.callZome(
      'get_cancellations_for_event',
      eventHash
    );
    return records.map(r => new EntryRecord(r));
  }
}
