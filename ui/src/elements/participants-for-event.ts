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

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';

@localized()
@customElement('participants-for-event')
export class ParticipantsForEvent extends LitElement {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

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
    () =>
      joinAsync([
        this.gatherStore.events.get(this.eventHash),
        pipe(
          this.gatherStore.participantsForEvent.get(this.eventHash),
          agentPubKeys => this.profilesStore.agentsProfiles(agentPubKeys)
        ),
      ]),
    () => [this.eventHash]
  );

  renderParticipantsList(
    participants: ReadonlyMap<AgentPubKey, Profile | undefined>
  ) {
    if (participants.size === 0)
      return html`<span class="placeholder"
        >${msg('This event has no participants yet.')}</span
      >`;
    return html`
      <div class="column">
        ${Array.from(participants.entries()).map(
          ([pubkey, profile]) => html`<div
            class="row"
            style="align-items: center; margin-bottom: 8px"
          >
            <agent-avatar
              size="40"
              slot="start"
              .agentPubKey=${pubkey}
            ></agent-avatar>
            <span style="margin-left:8px">${profile?.nickname}</span>
          </div>`
        )}
      </div>
    `;
  }

  renderParticipants(
    event: EntryRecord<Event>,
    participants: ReadonlyMap<AgentPubKey, Profile | undefined>
  ) {
    return html`
      <div class="row" style="align-items: center;" slot="header">
        <span class="title" style="flex: 1">${msg('Participants')}</span>

        <call-to-action-need-progress
          .callToActionHash=${event.entry.call_to_action_hash}
          .needIndex=${0}
          style="width: 150px"
        ></call-to-action-need-progress>
      </div>

      <div class="column" style="flex: 1">
        ${this.renderParticipantsList(participants)}
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
        return html`
          <sl-card style="flex: 1; display: flex;">
            ${this.renderParticipants(
              this._participants.value.value[0]!.currentEvent,
              this._participants.value.value[1]
            )}
          </sl-card>
        `;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the participants for this event')}
          .error=${this._participants.value.error}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
