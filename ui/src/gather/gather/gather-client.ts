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

  getEventCancellations(
    eventHash: ActionHash
  ): Promise<Array<SignedActionHashed> | undefined> {
    return this.callZome('get_event_cancellations', eventHash);
  }

  cancelEvent(originalEventHash: ActionHash): Promise<void> {
    return this.callZome('cancel_event', originalEventHash);
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
}
