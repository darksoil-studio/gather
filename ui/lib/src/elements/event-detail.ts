import {
  DisplayError,
  hashProperty,
  sharedStyles,
} from '@holochain-open-dev/elements';
import { ShowImage } from '@holochain-open-dev/file-storage';
import { AgentAvatar } from '@holochain-open-dev/profiles';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  Card,
  CircularProgress,
  MdFilledButton,
  MdIcon,
  MdStandardIconButton,
  Snackbar,
} from '@scoped-elements/material-web';
import { SlSkeleton } from '@scoped-elements/shoelace';
import { LitElement, html } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { property, state } from 'lit/decorators.js';

import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { Event } from '../types';
import { AttendeesForEvent } from './attendees-for-event';
import { EditEvent } from './edit-event';

@localized()
export class EventDetail extends ScopedElementsMixin(LitElement) {
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

  async deleteEvent() {
    try {
      await this.gatherStore.client.deleteEvent(this.eventHash);

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
      const errorSnackbar = this.shadowRoot?.getElementById(
        'error'
      ) as Snackbar;
      errorSnackbar.labelText = `Error deleting the event: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  async attendEvent() {
    try {
      await this.gatherStore.client.addAttendeeForEvent(
        this.eventHash,
        this.gatherStore.client.client.myPubKey
      );

      this.dispatchEvent(
        new CustomEvent('attendee-added', {
          bubbles: true,
          composed: true,
          detail: {
            eventHash: this.eventHash,
          },
        })
      );
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById(
        'error'
      ) as Snackbar;
      errorSnackbar.labelText = `${msg('Error adding attendee')}: ${
        e.data.data
      }`;
      errorSnackbar.show();
    }
  }

  renderDetail(entryRecord: EntryRecord<Event>) {
    const amIAuthor =
      entryRecord.action.author.toString() ===
      this.gatherStore.client.client.myPubKey.toString();
    return html`
      <mwc-snackbar id="error" leading> </mwc-snackbar>

      <mwc-card class="column">
        <show-image .imageHash=${entryRecord.entry.image}></show-image>

        <div
          style="display: flex; flex-direction: column; margin-left: 16px; margin-bottom: 16px;"
        >
          <div style="display: flex; flex-direction: row">
            <span
              class="title"
              style="flex: 1; margin-top: 16px; margin-bottom: 16px;"
              >${entryRecord.entry.title}</span
            >

            ${amIAuthor
              ? html`
                  <md-standard-icon-button
                    style="margin-left: 8px"
                    @click=${() => {
                      this._editing = true;
                    }}
                    >edit</md-standard-icon-button
                  >
                  <md-standard-icon-button
                    style="margin-left: 8px"
                    @click=${() => this.deleteEvent()}
                    >delete</md-standard-icon-button
                  >
                `
              : html``}
          </div>

          <div
            style="display: flex; flex-direction: column; margin-right: 16px"
          >
            <span style="white-space: pre-line; margin-bottom: 16px;"
              >${entryRecord.entry.description}</span
            >

            <div style="display: flex; flex-direction: row;">
              <div class="column" style="justify-content: end">
                <div
                  style="display: flex; flex-direction: row; align-items: center;"
                >
                  <md-icon style="margin-right: 4px">location_on</md-icon>
                  <span style="white-space: pre-line"
                    >${entryRecord.entry.location}</span
                  >
                </div>

                <div
                  style="display: flex; flex-direction: row; align-items: center"
                >
                  <md-icon style="margin-right: 4px">schedule</md-icon>
                  <span style="white-space: pre-line"
                    >${new Date(
                      entryRecord.entry.start_time / 1000
                    ).toLocaleString()}</span
                  >
                </div>

                ${entryRecord.entry.cost
                  ? html` <div
                      style="display: flex; flex-direction: row; align-items: center"
                    >
                      <md-icon style="margin-right: 4px">payments</md-icon>
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

            ${this.renderAttendButton(entryRecord)}
          </div>
        </div>
      </mwc-card>
    `;
  }

  renderAttendButton(event: EntryRecord<Event>) {
    switch (this._attendees.value.status) {
      case 'pending':
        return html`<sl-skeleton
          style="margin-top: 16px;"
          effect="pulse"
        ></sl-skeleton>`;
      case 'complete':
        if (
          event.action.author.toString() ===
          this.gatherStore.client.client.myPubKey.toString()
        )
          return html``;
        if (
          this._attendees.value.value
            .map(a => a.toString())
            .includes(this.gatherStore.client.client.myPubKey.toString())
        )
          return html``;
        return html`<md-filled-button
          style="margin-top: 16px;"
          .label=${msg("I'll attend!")}
          @click=${() => this.attendEvent()}
        ></md-filled-button>`;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the attendees')}
          .error=${this._attendees.value.error.data.data}
          tooltip
        ></display-error>`;
    }
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

    return html`<div class="row">
      ${this.renderDetail(maybeEntryRecord)}
      <attendees-for-event
        style="margin-left: 16px;"
        .eventHash=${this.eventHash}
      ></attendees-for-event>
    </div> `;
  }

  render() {
    switch (this._event.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case 'complete':
        return this.renderEvent(this._event.value.value);
      case 'error':
        return html`<display-error
          .error=${this._event.value.error.data.data}
        ></display-error>`;
    }
  }

  static get scopedElements() {
    return {
      'display-error': DisplayError,
      'edit-event': EditEvent,
      'md-icon': MdIcon,
      'mwc-circular-progress': CircularProgress,
      'mwc-snackbar': Snackbar,
      'mwc-card': Card,
      'md-standard-icon-button': MdStandardIconButton,
      'agent-avatar': AgentAvatar,
      'md-filled-button': MdFilledButton,
      'sl-skeleton': SlSkeleton,
      'show-image': ShowImage,
      'attendees-for-event': AttendeesForEvent,
    };
  }

  static styles = [sharedStyles];
}
