import {
  Assembly,
  CallToAction,
  Commitment,
  Satisfaction,
} from '@darksoil/assemble';
import { Cancellation } from '@holochain-open-dev/cancellations';
import { wrapPathInSvg } from '@holochain-open-dev/elements';
import { msg, str } from '@lit/localize';
import {
  mdiAlert,
  mdiCancel,
  mdiCheckBold,
  mdiClockRemove,
  mdiCreation,
  mdiHandshake,
  mdiPartyPopper,
  mdiUndo,
  mdiUpdate,
} from '@mdi/js';
import { EntryRecord } from '@holochain-open-dev/utils';
import { Event, Proposal } from './types';
import { ActionHash } from '@holochain/client';

export type EventAction =
  | {
      type: 'proposal_created';
      record: EntryRecord<Proposal>;
    }
  | {
      type: 'proposal_updated';
      record: EntryRecord<Proposal>;
    }
  | {
      type: 'proposal_cancelled';
      record: EntryRecord<Cancellation>;
    }
  | {
      type: 'proposal_expired';
      timestamp: number;
    }
  | {
      type: 'event_created';
      record: EntryRecord<Event>;
    }
  | {
      type: 'event_updated';
      record: EntryRecord<Event>;
    }
  | {
      type: 'event_cancelled';
      record: EntryRecord<Cancellation>;
    }
  | {
      type: 'commitment_created';
      record: EntryRecord<Commitment>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'commitment_cancelled';
      record: EntryRecord<Cancellation>;
      commitment: EntryRecord<Commitment>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'commitment_cancellation_undone';
      record: EntryRecord<void>;
      cancellation: EntryRecord<Cancellation>;
      commitment: EntryRecord<Commitment>;
    }
  | {
      type: 'satisfaction_created';
      record: EntryRecord<Satisfaction>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'satisfaction_deleted';
      record: EntryRecord<void>;
      satisfaction: EntryRecord<Satisfaction>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'assembly_created';
      record: EntryRecord<Assembly>;
    };

export type PickFieldTypes<U, K extends keyof U> = U extends any ? U[K] : never;

export type EventActionTypes = PickFieldTypes<EventAction, 'type'>;

export function actionTimestamp(action: EventAction): number {
  if ('timestamp' in action) return action.timestamp;
  return action.record.action.timestamp;
}

export type EventActionOnlyHash =
  | {
      type: 'proposal_created';
      actionHash: ActionHash;
    }
  | {
      type: 'proposal_updated';
      actionHash: ActionHash;
    }
  | {
      type: 'proposal_cancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'proposal_expired';
      actionHash: ActionHash;
      timestamp: number;
    }
  | {
      type: 'event_created';
      actionHash: ActionHash;
    }
  | {
      type: 'event_updated';
      actionHash: ActionHash;
    }
  | {
      type: 'event_cancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'commitment_created';
      actionHash: ActionHash;
    }
  | {
      type: 'commitment_cancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'commitment_cancellation_undone';
      actionHash: ActionHash;
    }
  | {
      type: 'satisfaction_created';
      actionHash: ActionHash;
    }
  | {
      type: 'satisfaction_deleted';
      actionHash: ActionHash;
    }
  | {
      type: 'assembly_created';
      actionHash: ActionHash;
    };

export type EventActivity = Array<EventAction>;

export function messageAndIcon(action: EventAction) {
  switch (action.type) {
    case 'proposal_created':
      return {
        message: msg('Proposal was created.'),
        icon: wrapPathInSvg(mdiCreation),
      };
    case 'proposal_cancelled':
      return {
        message: msg('Proposal was cancelled because:'),
        secondary: action.record.entry.reason,
        icon: wrapPathInSvg(mdiCancel),
      };
    case 'proposal_expired':
      return {
        message: msg(
          'Proposal expired without meeting the minimum required needs.'
        ),
        icon: wrapPathInSvg(mdiClockRemove),
      };
    case 'proposal_updated':
      return {
        message: msg('Proposal was updated.'),
        icon: wrapPathInSvg(mdiUpdate),
      };
    case 'event_created':
      return {
        message: action.record.entry.from_proposal
          ? msg('The proposal succeeded! It is now an event.')
          : msg('Event was created.'),
        icon: wrapPathInSvg(mdiCreation),
      };
    case 'event_cancelled':
      return {
        message: msg('Event was cancelled because:'),
        secondary: action.record.entry.reason,
        icon: wrapPathInSvg(mdiCancel),
      };
    case 'event_updated':
      return {
        message: msg('Event was updated.'),
        icon: wrapPathInSvg(mdiUpdate),
      };
    case 'commitment_created':
      if (action.record.entry.need_index === 0) {
        return {
          message: msg('New commitment to participate in the event.'),
          icon: wrapPathInSvg(mdiHandshake),
        };
      }
      return {
        message: msg('New contribution:'),
        secondary: msg(
          str`Commitment to contribute ${action.record.entry.amount} to need "${
            action.callToAction.entry.needs[action.record.entry.need_index]
              .description
          }".`
        ),
        icon: wrapPathInSvg(mdiHandshake),
      };
    case 'commitment_cancelled':
      return {
        message: msg(
          str`Commitment to contribute to need "${
            action.callToAction.entry.needs[action.commitment.entry.need_index]
              .description
          }" was cancelled because:`
        ),
        secondary: action.record.entry.reason,
        icon: wrapPathInSvg(mdiCancel),
      };
    case 'commitment_cancellation_undone':
      return {
        message: msg('Commitment was uncancelled.'),
        icon: wrapPathInSvg(mdiUndo),
      };
    case 'satisfaction_created':
      if (action.record.entry.need_index === 0) {
        return {
          message: msg(
            'The minimum required participants for the event has been reached.'
          ),
          icon: wrapPathInSvg(mdiHandshake),
        };
      }
      return {
        message: msg(
          str`Need "${
            action.callToAction.entry.needs[action.record.entry.need_index]
              .description
          }" was satisfied.`
        ),
        icon: wrapPathInSvg(mdiCheckBold),
      };
    case 'satisfaction_deleted':
      return {
        message: msg(
          str`Need "${
            action.callToAction.entry.needs[
              action.satisfaction.entry.need_index
            ].description
          }" is no longer satisfied!`
        ),
        icon: wrapPathInSvg(mdiAlert),
      };
    case 'assembly_created':
      return {
        message: msg('All needs have been satisfied!'),
        icon: wrapPathInSvg(mdiPartyPopper),
      };
  }
}
