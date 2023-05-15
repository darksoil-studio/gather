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