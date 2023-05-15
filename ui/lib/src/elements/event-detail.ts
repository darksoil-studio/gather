import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';

import '@darksoil/assemble/dist/elements/call-to-action-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-need-progress.js';

import './attendees-for-event.js';
import './edit-event.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';
import {
  mdiCalendarClock,
  mdiCash,
  mdiDelete,
  mdiMapMarker,
  mdiPencil,
} from '@mdi/js';

@localized()
@customElement('event-detail')
export class EventDetail extends LitElement {
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
  _event = new StoreSubscriber(this, () =>
    this.gatherStore.events.get(this.eventHash)
  );

  /**
   * @internal
   */
  _attendees = new StoreSubscriber(this, () =>
    this.gatherStore.attendeesForEvent.get(this.eventHash)
  );

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteEvent(event: EntryRecord<Event>) {
    try {
      await this.gatherStore.client.deleteEvent(this.eventHash);
      await this.gatherStore.assembleStore.client.closeCallToAction(
        event.entry.call_to_action_hash
      );

      this.dispatchEvent(
        new CustomEvent('event-deleted', {
          bubbles: true,
          composed: true,
          detail: {
            eventHash: this.eventHash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error deleting the event'));
      console.error(e);
    }
  }

  renderDetail(entryRecord: EntryRecord<Event>) {
    const amIAuthor =
      entryRecord.action.author.toString() ===
      this.gatherStore.client.client.myPubKey.toString();
    return html`
      <sl-card class="column" style="width: 700px">
        <show-image
          slot="image"
          .imageHash=${entryRecord.entry.image}
          style="width: 700px; height: 300px; flex-basis: 0;"
        ></show-image>

        <div style="display: flex; flex-direction: column; flex: 1;">
          <div style="display: flex; flex-direction: row">
            <span
              class="title"
              style="flex: 1; margin-top: 16px; margin-bottom: 16px;"
              >${entryRecord.entry.title}</span
            >

            ${amIAuthor
              ? html`
                  <sl-icon-button
                    title=${msg('edit')}
                    style="margin-left: 8px"
                    @click=${() => {
                      this._editing = true;
                    }}
                    .src=${wrapPathInSvg(mdiPencil)}
                  ></sl-icon-button>
                  <sl-icon-button
                    title=${msg('delete event')}
                    style="margin-left: 8px"
                    .src=${wrapPathInSvg(mdiDelete)}
                    @click=${() => this.deleteEvent(entryRecord)}
                  ></sl-icon-button>
                `
              : html``}
            <slot name="action"></slot>
          </div>

          <div style="display: flex; flex-direction: column;">
            <span style="white-space: pre-line; margin-bottom: 16px;"
              >${entryRecord.entry.description}</span
            >

            <div style="display: flex; flex-direction: row;">
              <div class="column" style="justify-content: end">
                <div
                  title=${msg('location')}
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
                  title=${msg('time')}
                  style="display: flex; flex-direction: row; align-items: center"
                >
                  <sl-icon
                    style="margin-right: 4px"
                    .src=${wrapPathInSvg(mdiCalendarClock)}
                  ></sl-icon>
                  <span style="white-space: pre-line"
                    >${new Date(
                      entryRecord.entry.start_time / 1000
                    ).toLocaleString()}
                    -
                    ${new Date(
                      entryRecord.entry.end_time / 1000
                    ).toLocaleString()}</span
                  >
                </div>

                ${entryRecord.entry.cost
                  ? html` <div
                      title=${msg('cost')}
                      style="display: flex; flex-direction: row; align-items: center"
                    >
                      <sl-icon
                        style="margin-right: 4px"
                        .src=${wrapPathInSvg(mdiCash)}
                      ></sl-icon>
                      <span style="white-space: pre-line"
                        >${entryRecord.entry.cost}</span
                      >
                    </div>`
                  : html``}
              </div>

              <span style="flex: 1"></span>

              <div class="column" style="justify-content: end">
                <div
                  class="row"
                  style="align-items: center; margin-bottom: 8px;"
                >
                  <span style="margin-right: 8px">${msg('Hosted by')}</span>
                  <agent-avatar
                    .agentPubKey=${entryRecord.action.author}
                  ></agent-avatar>
                </div>
              </div>
            </div>
          </div>
        </div>
      </sl-card>
    `;
  }

  renderEvent(maybeEntryRecord: EntryRecord<Event> | undefined) {
    if (!maybeEntryRecord)
      return html`<span>${msg("The requested event doesn't exist")}</span>`;

    if (this._editing) {
      return html`<edit-event
        .originalEventHash=${this.eventHash}
        .currentRecord=${maybeEntryRecord}
        @event-updated=${async () => {
          this._editing = false;
        }}
        @edit-canceled=${() => {
          this._editing = false;
        }}
        style="display: flex; flex: 1;"
      ></edit-event>`;
    }

    return html`<div class="row" style="justify-content: center">
      <div class="column" style="margin-right: 16px;">
        ${this.renderDetail(maybeEntryRecord)}

        <call-to-action-need
          .callToActionHash=${maybeEntryRecord.entry.call_to_action_hash}
          .hideNeeds=${[0]}
        ></call-to-action-need>
      </div>
      <div class="column">
        <attendees-for-event
          style="margin-bottom: 16px;"
          .eventHash=${this.eventHash}
        ></attendees-for-event>
        <slot name="attachments"></slot>
      </div>
    </div> `;
  }

  render() {
    switch (this._event.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return this.renderEvent(this._event.value.value);
      case 'error':
        return html`<display-error
          .error=${this._event.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
