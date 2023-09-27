import { CallToAction } from '@darksoil/assemble';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey, EntryHash, Record } from '@holochain/client';

export interface Event {
  title: string;

  description: string;

  image: EntryHash;

  location: string;

  start_time: number;

  end_time: number;

  cost: string | undefined;

  call_to_action_hash: ActionHash;
}

export type EventStatus =
  | 'open_event_proposal'
  | 'expired_event_proposal'
  | 'cancelled_event_proposal'
  | 'upcoming_event'
  | 'past_event'
  | 'cancelled_event';

export interface EventWithStatus {
  originalActionHash: ActionHash;
  currentEvent: EntryRecord<Event>;
  status: EventStatus;
}
