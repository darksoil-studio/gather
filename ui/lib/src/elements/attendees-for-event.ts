import { hashProperty, sharedStyles } from '@holochain-open-dev/elements';
import {
  Profile,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import { asyncDeriveStore, StoreSubscriber } from '@holochain-open-dev/stores';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';

@localized()
@customElement('attendees-for-event')
export class AttendeesForEvent extends LitElement {
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
    asyncDeriveStore(
      this.gatherStore.attendeesForEvent.get(this.eventHash),
      agentPubKeys => this.profilesStore.agentsProfiles(agentPubKeys)
    )
  );

  renderList(attendees: ReadonlyMap<AgentPubKey, Profile | undefined>) {
    if (attendees.size === 0)
      return html`<span style="margin: 16px"
        >${msg('This event has no attendees yet')}</span
      >`;

    return html`
      <div style="display: flex; flex-direction: column">
        ${Array.from(attendees.entries()).map(
          ([pubkey, profile]) => html`<div
            class="row"
            style="align-items: center"
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

  render() {
    switch (this._attendees.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return html`
          <sl-card style="flex: 1; display: flex;">
            <span
              slot="header"
              class="title"
              style="margin-left: 16px; margin-top: 16px; margin-bottom: 8px"
              >${msg('Attendees')}</span
            >
            ${this.renderList(this._attendees.value.value)}
          </sl-card>
        `;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the attendees for this event')}
          .error=${this._attendees.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
