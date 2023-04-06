import { ActionHash, AgentPubKey, EntryHash, Record } from '@holochain/client';

export interface Event {
  title: string;

  description: string;

  image: EntryHash;

  location: string;

  start_time: number;

  end_time: number;

  cost: string | undefined;
}

export interface AttendeesAttestation {
  ateendees: Array<AgentPubKey>;

  event_hash: ActionHash;
}
