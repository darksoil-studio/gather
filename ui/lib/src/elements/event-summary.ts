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

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';

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
  _event = new StoreSubscriber(this, () =>
    this.gatherStore.events.get(this.eventHash)
  );

  /**
   * @internal
   */
  _attendees = new StoreSubscriber(this, () =>
    this.gatherStore.attendeesForEvent.get(this.eventHash)
  );

  renderSummary(entryRecord: EntryRecord<Event>) {
    return html`
      <div style="display: flex; flex-direction: row; flex: 1">
        <div style="display: flex; flex-direction: column; flex: 1;">
          <span class="title">${entryRecord.entry.title}</span>

          <span style="white-space: pre-line"
            >${entryRecord.entry.description}</span
          >

          <span style="flex: 1"></span>

          <div style="display: flex; flex-direction: row;">
            <div class="column" style="justify-content: end">
              <div
                style="display: flex; flex-direction: row; align-items: center;"
              >
                <sl-icon
                  style="margin-right: 4px"
                  .src=${wrapPathInSvg(mdiMapMarker)}
                ></sl-icon>
                <span style="white-space: pre-line"
                  >${entryRecord.entry.location}</span
                >
              </div>

              <div
                style="display: flex; flex-direction: row; align-items: center"
              >
                <sl-icon
                  style="margin-right: 4px"
                  .src=${wrapPathInSvg(mdiCalendarClock)}
                ></sl-icon>
                <span style="white-space: pre-line"
                  >${new Date(
                    entryRecord.entry.start_time / 1000
                  ).toLocaleString()}</span
                >
              </div>
            </div>

            <span style="flex: 1"></span>

            <div class="column">
              <div class="row" style="align-items: center; margin-bottom: 8px;">
                <span style="margin-right: 8px">${msg('Hosted by')}</span>
                <agent-avatar
                  .agentPubKey=${entryRecord.action.author}
                ></agent-avatar>
              </div>

              ${this._attendees.value.status === 'complete'
                ? html`<div class="row" style="align-items: center;">
                    <span style="margin-right: 8px;">${msg('Attendees')}</span>
                    <div class="avatar-group">
                      ${this._attendees.value.value.map(
                        a =>
                          html`<agent-avatar .agentPubKey=${a}></agent-avatar>`
                      )}
                    </div>
                  </div>`
                : html``}
            </div>
          </div>
        </div>

        <show-image
          style="width: 200px; height: 200px; flex: 0; margin-top: -20px; margin-bottom: -20px; margin-right: -20px"
          .imageHash=${entryRecord.entry.image}
        ></show-image>
      </div>
    `;
  }

  renderEvent(event: AsyncStatus<EntryRecord<Event> | undefined>) {
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
          .error=${event.error.data.data}
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
        margin-left: -1rem;
      }
      :host {
        display: flex;
      }
    `,
  ];
}
