import {
  hashProperty,
  notifyError,
  sharedStyles,
} from '@holochain-open-dev/elements';
import {
  Profile,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import {
  joinAsync,
  pipe,
  StoreSubscriber,
  toPromise,
} from '@holochain-open-dev/stores';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EntryRecord } from '@holochain-open-dev/utils';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import './profile-list-item.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event, Proposal } from '../types.js';

@localized()
@customElement('participants-for-event')
export class ParticipantsForEvent extends LitElement {
  @property(hashProperty('event-hash'))
  eventHash: ActionHash | undefined;

  @property(hashProperty('proposal-hash'))
  proposalHash: ActionHash | undefined;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  @consume({ context: profilesStoreContext, subscribe: true })
  profilesStore!: ProfilesStore;

  /**
   * @internal
   */
  _participants = new StoreSubscriber(
    this,
    () => {
      if (this.eventHash)
        return joinAsync([
          this.gatherStore.events.get(this.eventHash),
          this.gatherStore.participantsForEvent.get(this.eventHash),
          this.gatherStore.interestedInEvent.get(this.eventHash),
        ]);
      return joinAsync([
        this.gatherStore.proposals.get(this.proposalHash!),
        this.gatherStore.participantsForProposal.get(this.proposalHash!),
        this.gatherStore.interestedInProposal.get(this.proposalHash!),
      ]);
    },
    () => [this.eventHash, this.proposalHash]
  );

  renderParticipantsList(
    participants: AgentPubKey[],
    placeholderLabel: string
  ) {
    if (participants.length === 0)
      return html`<span class="placeholder">${placeholderLabel}</span>`;
    return html`
      <div class="column" style="gap: 8px">
        ${participants.map(
          pubkey => html`
            <profile-list-item .agentPubKey=${pubkey}></profile-list-item>
          `
        )}
      </div>
    `;
  }

  renderParticipants(
    event: EntryRecord<Event | Proposal>,
    participants: AgentPubKey[],
    interested: AgentPubKey[]
  ) {
    return html`
      <div class="column" style="gap: 16px">
        <div class="row" style="align-items: center;">
          <span class="title" style="flex: 1">${msg('Participants')}</span>

          <call-to-action-need-progress
            .callToActionHash=${event.entry.call_to_action_hash}
            .needIndex=${0}
            style="width: 150px"
          ></call-to-action-need-progress>
        </div>

        <div class="column" style="flex: 1">
          ${this.renderParticipantsList(
            participants,

            this.eventHash
              ? msg('This event has no participants yet.')
              : msg('This proposal has no participants yet.')
          )}
          ${this.renderParticipantsList(
            interested,

            this.eventHash
              ? msg('No one is interested in this event yet.')
              : msg('No one is interested in this proposal yet.')
          )}
        </div>
      </div>
    `;
  }

  render() {
    switch (this._participants.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return this.renderParticipants(
          this._participants.value.value[0],
          this._participants.value.value[1],
          this._participants.value.value[2]
        );
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the participants for this event')}
          .error=${this._participants.value.error}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
