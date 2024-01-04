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
  mdiAccountGroup,
  mdiAlert,
  mdiCancel,
  mdiCheckBold,
  mdiClockRemove,
  mdiCreation,
  mdiHandshake,
  mdiPartyPopper,
  mdiUndo,
  mdiUndoVariant,
  mdiUpdate,
} from '@mdi/js';
import { EntryRecord } from '@holochain-open-dev/utils';
import { Event, Proposal } from './types';
import { ActionHash } from '@holochain/client';

export type EventAction =
  | {
      type: 'ProposalCreated';
      record: EntryRecord<Proposal>;
    }
  | {
      type: 'ProposalUpdated';
      record: EntryRecord<Proposal>;
    }
  | {
      type: 'ProposalCancelled';
      record: EntryRecord<Cancellation>;
    }
  | {
      type: 'ProposalUncancelled';
      record: EntryRecord<void>;
      proposal: EntryRecord<Proposal>;
    }
  | {
      type: 'ProposalExpired';
      timestamp: number;
    }
  | {
      type: 'EventCreated';
      record: EntryRecord<Event>;
    }
  | {
      type: 'EventUpdated';
      record: EntryRecord<Event>;
    }
  | {
      type: 'EventCancelled';
      record: EntryRecord<Cancellation>;
    }
  | {
      type: 'EventUncancelled';
      record: EntryRecord<void>;
      event: EntryRecord<Event>;
    }
  | {
      type: 'CommitmentCreated';
      record: EntryRecord<Commitment>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'CommitmentCancelled';
      record: EntryRecord<Cancellation>;
      commitment: EntryRecord<Commitment>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'CommitmentCancellationUndone';
      record: EntryRecord<void>;
      cancellation: EntryRecord<Cancellation>;
      commitment: EntryRecord<Commitment>;
    }
  | {
      type: 'SatisfactionCreated';
      record: EntryRecord<Satisfaction>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'SatisfactionDeleted';
      record: EntryRecord<void>;
      satisfaction: EntryRecord<Satisfaction>;
      callToAction: EntryRecord<CallToAction>;
    }
  | {
      type: 'AssemblyCreated';
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
      type: 'ProposalCreated';
      actionHash: ActionHash;
    }
  | {
      type: 'ProposalUpdated';
      actionHash: ActionHash;
    }
  | {
      type: 'ProposalCancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'ProposalUncancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'ProposalExpired';
      actionHash: ActionHash;
      timestamp: number;
    }
  | {
      type: 'EventCreated';
      actionHash: ActionHash;
    }
  | {
      type: 'EventUpdated';
      actionHash: ActionHash;
    }
  | {
      type: 'EventCancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'EventUncancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'CommitmentCreated';
      actionHash: ActionHash;
    }
  | {
      type: 'CommitmentCancelled';
      actionHash: ActionHash;
    }
  | {
      type: 'CommitmentCancellationUndone';
      actionHash: ActionHash;
    }
  | {
      type: 'SatisfactionCreated';
      actionHash: ActionHash;
    }
  | {
      type: 'SatisfactionDeleted';
      actionHash: ActionHash;
    }
  | {
      type: 'AssemblyCreated';
      actionHash: ActionHash;
    };

export type EventActivity = Array<EventAction>;

export function messageAndIcon(action: EventAction) {
  switch (action.type) {
    case 'ProposalCreated':
      return {
        message: msg('Proposal was created.'),
        icon: wrapPathInSvg(mdiCreation),
      };
    case 'ProposalCancelled':
      return {
        message: msg('Proposal was cancelled because:'),
        secondary: action.record.entry.reason,
        icon: wrapPathInSvg(mdiCancel),
      };
    case 'ProposalUncancelled':
      return {
        message: msg('Proposal was uncancelled!'),
        icon: wrapPathInSvg(mdiUndoVariant),
      };
    case 'ProposalExpired':
      return {
        message: msg(
          'Proposal expired without meeting the minimum required needs.'
        ),
        icon: wrapPathInSvg(mdiClockRemove),
      };
    case 'ProposalUpdated':
      return {
        message: msg('Proposal was updated.'),
        icon: wrapPathInSvg(mdiUpdate),
      };
    case 'EventCreated':
      return {
        message: action.record.entry.from_proposal
          ? msg('The proposal succeeded! It is now an event.')
          : msg('Event was created.'),
        icon: wrapPathInSvg(mdiCreation),
      };
    case 'EventCancelled':
      return {
        message: msg('Event was cancelled because:'),
        secondary: action.record.entry.reason,
        icon: wrapPathInSvg(mdiCancel),
      };
    case 'EventUncancelled':
      return {
        message: msg('Event was uncancelled!'),
        icon: wrapPathInSvg(mdiUndoVariant),
      };
    case 'EventUpdated':
      return {
        message: msg('Event was updated.'),
        icon: wrapPathInSvg(mdiUpdate),
      };
    case 'CommitmentCreated':
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
    case 'CommitmentCancelled':
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
    case 'CommitmentCancellationUndone':
      return {
        message: msg('Commitment was uncancelled.'),
        icon: wrapPathInSvg(mdiUndo),
      };
    case 'SatisfactionCreated':
      if (action.record.entry.need_index === 0) {
        return {
          message: msg(
            'The minimum required participants for the event has been reached.'
          ),
          icon: wrapPathInSvg(mdiAccountGroup),
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
    case 'SatisfactionDeleted':
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
    case 'AssemblyCreated':
      return {
        message: msg('All needs have been satisfied!'),
        icon: wrapPathInSvg(mdiPartyPopper),
      };
  }
}
