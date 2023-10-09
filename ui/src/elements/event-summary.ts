import {
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import {
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import { EntryRecord } from '@holochain-open-dev/utils';
import { AsyncStatus, StoreSubscriber } from '@holochain-open-dev/stores';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiCalendarClock, mdiMapMarker } from '@mdi/js';

import '@darksoil/assemble/dist/elements/call-to-action-progress.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event, EventWithStatus } from '../types.js';

@localized()
@customElement('event-summary')
export class EventSummary extends LitElement {
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
  _event = new StoreSubscriber(
    this,
    () => this.gatherStore.events.get(this.eventHash),
    () => [this.eventHash]
  );

  /**
   * @internal
   */
  _participants = new StoreSubscriber(
    this,
    () => this.gatherStore.participantsForEvent.get(this.eventHash),
    () => [this.eventHash]
  );

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  renderParticipants() {
    if (this._participants.value.status !== 'complete') return html``;
    const participants = this._participants.value.value;

    if (participants.length === 0)
      return html`<span>${msg('No participants yet')}</span>`;

    return html` <div class="row avatar-group">
      ${participants
        .slice(0, 3)
        .map(a => html`<agent-avatar .agentPubKey=${a}></agent-avatar>`)}
      ${participants.length > 3
        ? html`<sl-avatar
            .initials=${`+${participants.length - 3}`}
            style="--size: 32px"
          ></sl-avatar>`
        : html``}
    </div>`;
  }

  renderSummary(event: EventWithStatus) {
    return html`
      ${this._isMobile
        ? html`
            <show-image
              slot="image"
              style="flex: 1; height: 200px"
              .imageHash=${event.currentEvent.entry.image}
            ></show-image>
          `
        : html``}

      <div style="display: flex; flex-direction: row; flex: 1">
        <div style="display: flex; flex-direction: column; flex: 1; gap: 8px">
          <div
            style="display: flex; flex-direction: row; flex: 1; align-items: center"
          >
            <span class="title" style="flex: 1"
              >${event.currentEvent.entry.title}</span
            >
          </div>

          <span style="flex: 1"></span>

          <div style="display: flex; flex-direction: row; ">
            <div class="column" style="justify-content: end; gap: 8px">
              ${this._isMobile
                ? html``
                : html`
                    <div
                      style="display: flex; flex-direction: row; align-items: center; gap: 4px"
                    >
                      <sl-icon
                        title=${msg('location')}
                        .src=${wrapPathInSvg(mdiMapMarker)}
                      ></sl-icon>
                      <span style="white-space: pre-line"
                        >${event.currentEvent.entry.location}</span
                      >
                    </div>
                  `}
              <div
                style="display: flex; flex-direction: row; align-items: center; gap: 4px"
              >
                <sl-icon .src=${wrapPathInSvg(mdiCalendarClock)}></sl-icon>
                <span style="white-space: pre-line"
                  >${new Date(
                    event.currentEvent.entry.start_time / 1000
                  ).toLocaleString()}</span
                >
              </div>
            </div>

            <span style="flex: 1"></span>

            <div class="column" style="justify-content: end">
              ${this.renderParticipants()}
            </div>
          </div>

          ${event.status === 'open_event_proposal'
            ? html` <call-to-action-progress
                .callToActionHash=${event.currentEvent.entry
                  .call_to_action_hash}
              ></call-to-action-progress>`
            : html``}
        </div>

        ${!this._isMobile
          ? html` <show-image
              style="width: 200px; height: 200px; margin-top: -20px; margin-bottom: -20px; margin-right: -20px; margin-left: 16px"
              .imageHash=${event.currentEvent.entry.image}
            ></show-image>`
          : html``}
      </div>
    `;
  }

  renderEvent(event: AsyncStatus<EventWithStatus>) {
    switch (event.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        if (!event.value)
          return html`<span>${msg("The requested event doesn't exist")}</span>`;

        return this.renderSummary(event.value);
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the event')}
          .error=${event.error}
        ></display-error>`;
    }
  }

  render() {
    return html`<sl-card
      style=" flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent('event-selected', {
            bubbles: true,
            composed: true,
            detail: {
              eventHash: this.eventHash,
            },
          })
        )}
    >
      ${this.renderEvent(this._event.value)}
    </sl-card>`;
  }

  static styles = [
    sharedStyles,
    css`
      .avatar-group agent-avatar:not(:first-of-type) {
        margin-left: -0.5rem;
      }

      sl-icon {
        font-size: 24px;
      }

      :host {
        display: flex;
      }
    `,
  ];
}
