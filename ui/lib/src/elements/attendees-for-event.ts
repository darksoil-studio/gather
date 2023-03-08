import {
  DisplayError,
  hashProperty,
  sharedStyles,
} from '@holochain-open-dev/elements';
import {
  AgentAvatar,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import {
  asyncDeriveStore,
  joinAsyncMap,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { slice } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  Card,
  CircularProgress,
  MdList,
  MdListItem,
} from '@scoped-elements/material-web';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';

import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';

@localized()
export class AttendeesForEvent extends ScopedElementsMixin(LitElement) {
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
  _attendees = new StoreSubscriber(this, () =>
    this.gatherStore.attendeesForEvent.get(this.eventHash)
  );

  /**
   * @internal
   */
  _profiles = new StoreSubscriber(this, () =>
    asyncDeriveStore(this._attendees.store()!, agentPubKeys =>
      joinAsyncMap(slice(this.profilesStore.profiles, agentPubKeys))
    )
  );

  renderList(hashes: Array<AgentPubKey>) {
    if (hashes.length === 0)
      return html`<span style="margin: 16px"
        >${msg('This event has no attendees yet')}</span
      >`;

    switch (this._profiles.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case 'complete':
        const profiles = this._profiles.value.value;
        return html`
          <md-list style="display: flex; flex-direction: column">
            ${hashes.map(
              pubkey => html`<md-list-item
                .headline=${profiles.get(pubkey)?.nickname}
              >
                <agent-avatar
                  size="40"
                  slot="start"
                  .agentPubKey=${pubkey}
                ></agent-avatar>
              </md-list-item>`
            )}
          </md-list>
        `;
      case 'error':
        return html`<display-error
          .error=${this._profiles.value.error.data.data}
        ></display-error>`;
    }
  }

  render() {
    switch (this._attendees.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case 'complete':
        return html`
          <mwc-card style="flex: 1; display: flex;">
            <div class="column">
              <span
                class="title"
                style="margin-left: 16px; margin-top: 16px; margin-bottom: 8px"
                >${msg('Attendees')}</span
              >
              ${this.renderList(this._attendees.value.value)}
            </div>
          </mwc-card>
        `;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the attendees for this event')}
          .error=${this._attendees.value.error.data.data}
        ></display-error>`;
    }
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'agent-avatar': AgentAvatar,
      'md-list': MdList,
      'md-list-item': MdListItem,
      'display-error': DisplayError,
      'mwc-card': Card,
    };
  }

  static styles = [sharedStyles];
}
