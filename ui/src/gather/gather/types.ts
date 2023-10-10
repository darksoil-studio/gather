import { CallToAction } from '@darksoil/assemble';
import { EntryRecord } from '@holochain-open-dev/utils';
import {
  ActionHash,
  Create,
  CreateLink,
  Delete,
  DeleteLink,
  EntryHash,
  SignedActionHashed,
  Update,
} from '@holochain/client';

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
  callToAction: EntryRecord<CallToAction>;
}

export type GatherSignal =
  | {
      type: 'EntryCreated';
      action: SignedActionHashed<Create>;
      app_entry: EntryTypes;
    }
  | {
      type: 'EntryUpdated';
      action: SignedActionHashed<Update>;
      app_entry: EntryTypes;
      original_app_entry: EntryTypes;
    }
  | {
      type: 'EntryDeleted';
      action: SignedActionHashed<Delete>;
      original_app_entry: EntryTypes;
    }
  | {
      type: 'LinkCreated';
      action: SignedActionHashed<CreateLink>;
      link_type: string;
    }
  | {
      type: 'LinkDeleted';
      action: SignedActionHashed<DeleteLink>;
      link_type: string;
    };

export type EntryTypes =
  | ({ type: 'Cancellation' } & Cancellation)
  | ({ type: 'Event' } & Event);

export interface Cancellation {
  reason: string;

  event_hash: ActionHash;
}
