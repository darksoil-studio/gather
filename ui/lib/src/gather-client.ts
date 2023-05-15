import { EntryRecord, ZomeClient } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppAgentClient,
  Record,
  SignedActionHashed,
} from '@holochain/client';

import { Event } from './types';

type GatherSignal = {};

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

  createEvent(event: Event): Promise<Record> {
    return this.callZome('create_event', event);
  }

  async getEvent(eventHash: ActionHash): Promise<GetEventOutput | undefined> {
    const output: any | undefined = await this.callZome('get_event', eventHash);
    if (!output) return undefined;

    return {
      event: new EntryRecord(output.record),
      deletes: output.deletes,
    };
  }

  async getEventForCallToAction(
    callToActionHash: ActionHash
  ): Promise<ActionHash> {
    return this.callZome('get_event_for_call_to_action', callToActionHash);
  }

  deleteEvent(originalEventHash: ActionHash): Promise<ActionHash> {
    return this.callZome('delete_event', originalEventHash);
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

  getAllEvents(): Promise<Array<ActionHash>> {
    return this.callZome('get_all_events', null);
  }

  /** Events By Author */

  async getEventsByAuthor(
    author: AgentPubKey
  ): Promise<Array<EntryRecord<Event>>> {
    const records: Record[] = await this.callZome(
      'get_events_by_author',
      author
    );
    return records.map(r => new EntryRecord(r));
  }
}
