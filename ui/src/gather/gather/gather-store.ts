import { AttendeesAttestation } from './types';

import { Event } from './types';

import {
  ActionHashMap,
  AgentPubKeyMap,
  EntryHashMap,
  EntryRecord,
  EntryState,
  RecordBag,
  entryState,
} from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey, EntryHash, Record } from '@holochain/client';
import { Readable, Writable, derived, get, writable } from 'svelte/store';

import { GatherClient } from './gather-client';

export class GatherStore {
  /** Static info */
  public myAgentPubKey: AgentPubKey;

  constructor(public client: GatherClient) {
    this.myAgentPubKey = client.cellClient.cell.cell_id[1];
  }
  
  /** Event */

  private _events: Writable<RecordBag<Event>> = writable(new RecordBag());

  async createEvent(event: Event): Promise<Record> {
    const record = await this.client.createEvent(event);
    
    this._events.update(bag => {
      bag.add([record]);
      return bag;
    });
    
    return record;
  }

  async fetchEvent(eventHash: ActionHash): Promise<Readable<EntryState<Event> | undefined>> {
    const record = await this.client.getEvent(eventHash);
    
    if (record) {   
      this._events.update(bag => {
        bag.add([record]);
        return bag;
      });
    }
    
    return derived(this._events, bag => entryState(bag, eventHash));
  }
  
  async deleteEvent(originalEventHash: ActionHash): Promise<void> {
    const deleteActionHash = await this.client.deleteEvent(originalEventHash);
    
    this._events.update(bag => {
      const deletes = bag.deletes.get(originalEventHash) || [];
      bag.deletes.put(originalEventHash, [...deletes, deleteActionHash]);
      return bag;
    });
  }

  async updateEvent(originalEventHash: ActionHash, previousEventHash: ActionHash, updatedEvent: Event): Promise<EntryRecord<Event>> {
    const updateRecord = await this.client.updateEvent(originalEventHash, previousEventHash, updatedEvent);
    
    this._events.update(bag => {
      bag.add([updateRecord]);
      const updates = bag.updates.get(originalEventHash) || [];
      bag.updates.put(originalEventHash, [...updates, updateRecord.signed_action.hashed.hash]);
      return bag;
    });
    
    return new EntryRecord(updateRecord);
  }
  /** Attendees for Event */
  private _attendeesForEvent: Writable<ActionHashMap<Array<AgentPubKey>>> = writable(new ActionHashMap());
  private _eventsForAttendee: Writable<AgentPubKeyMap<Array<ActionHash>>> = writable(new AgentPubKeyMap());

  async fetchAttendeesForEvent(eventHash: ActionHash): Promise<Readable<Array<AgentPubKey>>> {
    const hashes = await this.client.getAttendeesForEvent(eventHash);
    
    this._attendeesForEvent.update(hashMap => {
      const previousHashes = hashMap.get(eventHash) || [];
      hashMap.put(eventHash, [...previousHashes, ...hashes]);
      return hashMap;
    });
    
    return derived(this._attendeesForEvent, hashMap => hashMap.get(eventHash));
  }
  
  async addAttendeesForEvent(eventHash: ActionHash, attendee: AgentPubKey): Promise<void> {
    await this.client.addAttendeesForEvent(eventHash, attendee);
    
    this._attendeesForEvent.update(hashMap => {
      const previousHashes = hashMap.get(eventHash) || [];
      hashMap.put(eventHash, [...previousHashes, attendee]);
      return hashMap;
    });
    
    this._eventsForAttendee.update(hashMap => {
      const previousHashes = hashMap.get(attendee) || [];
      hashMap.put(attendee, [...previousHashes, eventHash]);
      return hashMap;
    });
  }
  
  async fetchEventsForAttendee(attendee: AgentPubKey): Promise<Readable<Array<ActionHash>>> {
    const hashes = await this.client.getEventsForAttendee(attendee);
    
    this._eventsForAttendee.update(hashMap => {
      const previousHashes = hashMap.get(attendee) || [];
      hashMap.put(attendee, [...previousHashes, ...hashes]);
      return hashMap;
    });
    
    return derived(this._eventsForAttendee, hashMap => hashMap.get(attendee));
  }
  
  /** Attendees Attestation */

  private _attendeesAttestations: Writable<RecordBag<AttendeesAttestation>> = writable(new RecordBag());

  private _attendeesAttestationsForAteendee: Writable<AgentPubKeyMap<Array<ActionHash>>> = writable(new AgentPubKeyMap());

  private _attendeesAttestationsForEvent: Writable<ActionHashMap<Array<ActionHash>>> = writable(new ActionHashMap());

  async createAttendeesAttestation(attendeesAttestation: AttendeesAttestation): Promise<Record> {
    const record = await this.client.createAttendeesAttestation(attendeesAttestation);
    
    this._attendeesAttestations.update(bag => {
      bag.add([record]);
      return bag;
    });
    
    return record;
  }

  async fetchAttendeesAttestation(attendeesAttestationHash: ActionHash): Promise<Readable<EntryState<AttendeesAttestation> | undefined>> {
    const record = await this.client.getAttendeesAttestation(attendeesAttestationHash);
    
    if (record) {   
      this._attendeesAttestations.update(bag => {
        bag.add([record]);
        return bag;
      });
    }
    
    return derived(this._attendeesAttestations, bag => entryState(bag, attendeesAttestationHash));
  }
  

  async updateAttendeesAttestation(originalAttendeesAttestationHash: ActionHash, previousAttendeesAttestationHash: ActionHash, updatedAttendeesAttestation: AttendeesAttestation): Promise<EntryRecord<AttendeesAttestation>> {
    const updateRecord = await this.client.updateAttendeesAttestation( previousAttendeesAttestationHash, updatedAttendeesAttestation);
    
    this._attendeesAttestations.update(bag => {
      bag.add([updateRecord]);
      const updates = bag.updates.get(originalAttendeesAttestationHash) || [];
      bag.updates.put(originalAttendeesAttestationHash, [...updates, updateRecord.signed_action.hashed.hash]);
      return bag;
    });
    
    return new EntryRecord(updateRecord);
  }
  
  async fetchAttendeesAttestationsForAteendee(ateendee: AgentPubKey): Promise<Readable<Array<ActionHash>>> {
    const hashes = await this.client.getAttendeesAttestationsForAteendee(ateendee);
    
    this._attendeesAttestationsForAteendee.update(hashMap => {
      const previousHashes = hashMap.get(ateendee) || [];
      hashMap.put(ateendee, [...previousHashes, ...hashes]);
      return hashMap;
    });
    
    return derived(this._attendeesAttestationsForAteendee, hashMap => hashMap.get(ateendee));
  }
  async fetchAttendeesAttestationsForEvent(eventHash: ActionHash): Promise<Readable<Array<ActionHash>>> {
    const hashes = await this.client.getAttendeesAttestationsForEvent(eventHash);
    
    this._attendeesAttestationsForEvent.update(hashMap => {
      const previousHashes = hashMap.get(eventHash) || [];
      hashMap.put(eventHash, [...previousHashes, ...hashes]);
      return hashMap;
    });
    
    return derived(this._attendeesAttestationsForEvent, hashMap => hashMap.get(eventHash));
  }
  
  /** All Events */
  private _allEvents: Writable<Array<ActionHash>> = writable([]);

  async fetchAllEvents(): Promise<Readable<Array<ActionHash>>> {
    const hashes = await this.client.getAllEvents();
    
    this._allEvents.set(hashes);
    
    return derived(this._allEvents, i => i);
  }
}
