import { CallToAction } from '@darksoil/assemble';
import { EntryRecord, ActionCommittedSignal } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey, EntryHash } from '@holochain/client';

export interface IndexedHash {
  type: 'event' | 'proposal';
  hash: ActionHash;
}

export type EventTime =
  | {
      type: 'Periodic';
      start_time: number;
      event_duration: number;
      period_duration: number;
      ocurrences: number | undefined;
    }
  | {
      type: 'Unique';
      start_time: number;
      end_time: number;
    };

export interface FromProposal {
  proposal_hash: ActionHash;
  assembly_hash: ActionHash | undefined;
}

export interface Event {
  hosts: Array<AgentPubKey>;
  title: string;
  description: string;
  image: EntryHash;
  location: string;
  time: EventTime;
  cost: string | undefined;
  call_to_action_hash: ActionHash;
  from_proposal: FromProposal | undefined;
}

export interface Proposal {
  hosts: Array<AgentPubKey>;
  title: string;
  description: string;
  image: EntryHash;
  location: string | undefined;
  time: EventTime | undefined;
  cost: string | undefined;
  call_to_action_hash: ActionHash;
}

export type EventStatus = 'upcoming_event' | 'past_event' | 'cancelled_event';

export type ProposalStatus =
  | { type: 'open_proposal' }
  | { type: 'expired_proposal' }
  | { type: 'cancelled_proposal' }
  | { type: 'fulfilled_proposal'; assemblyHash: ActionHash }
  | { type: 'actual_event'; eventHash: ActionHash };

export interface ProposalWithStatus {
  originalActionHash: ActionHash;
  currentProposal: EntryRecord<Proposal>;
  status: ProposalStatus;
  callToAction: EntryRecord<CallToAction>;
}

export interface EventWithStatus {
  originalActionHash: ActionHash;
  currentEvent: EntryRecord<Event>;
  status: EventStatus;
}

export type GatherSignal = ActionCommittedSignal<EntryTypes, any>;

export type EntryTypes =
  | ({ type: 'Proposal' } & Proposal)
  | ({ type: 'Event' } & Event);
