import { EntryRecord, ZomeClient } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppAgentClient,
  Record,
} from '@holochain/client';

import { AttendeesAttestation } from './types';
import { Event } from './types';

type GatherSignal = {};

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

  async getEvent(
    eventHash: ActionHash
  ): Promise<EntryRecord<Event> | undefined> {
    const record: Record | undefined = await this.callZome(
      'get_event',
      eventHash
    );
    return record ? new EntryRecord(record) : undefined;
  }

  async getEventForCallToAction(callToAction: ActionHash): Promise<ActionHash> {
    return this.callZome('get_event_for_call_to_action', callToAction);
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

  /** Attendees for Event */

  getAttendeesForEvent(eventHash: ActionHash): Promise<Array<AgentPubKey>> {
    return this.callZome('get_attendees_for_event', eventHash);
  }

  addAttendeeForEvent(
    eventHash: ActionHash,
    attendee: AgentPubKey
  ): Promise<void> {
    return this.callZome('add_attendee_for_event', {
      event_hash: eventHash,
      attendee,
    });
  }

  getEventsForAttendee(attendee: AgentPubKey): Promise<Array<ActionHash>> {
    return this.callZome('get_events_for_attendee', attendee);
  }
  /** Attendees Attestation */

  createAttendeesAttestation(
    attendeesAttestation: AttendeesAttestation
  ): Promise<Record> {
    return this.callZome('create_attendees_attestation', attendeesAttestation);
  }

  getAttendeesAttestation(
    attendeesAttestationHash: ActionHash
  ): Promise<Record | undefined> {
    return this.callZome('get_attendees_attestation', attendeesAttestationHash);
  }

  updateAttendeesAttestation(
    previousAttendeesAttestationHash: ActionHash,
    updatedAttendeesAttestation: AttendeesAttestation
  ): Promise<Record> {
    return this.callZome('update_attendees_attestation', {
      previous_attendees_attestation_hash: previousAttendeesAttestationHash,
      updated_attendees_attestation: updatedAttendeesAttestation,
    });
  }

  getAttendeesAttestationsForAteendee(
    ateendee: AgentPubKey
  ): Promise<Array<ActionHash>> {
    return this.callZome('get_attendees_attestations_for_ateendee', ateendee);
  }

  getAttendeesAttestationsForEvent(
    eventHash: ActionHash
  ): Promise<Array<ActionHash>> {
    return this.callZome('get_attendees_attestations_for_event', eventHash);
  }

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
