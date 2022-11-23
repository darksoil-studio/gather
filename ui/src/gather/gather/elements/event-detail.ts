import { hashProperty } from '@holochain-open-dev/elements';
import { ShowImage } from '@holochain-open-dev/file-storage';
import { AgentAvatar } from '@holochain-open-dev/profiles';
import { EntryRecord, RecordBag } from '@holochain-open-dev/utils';
import { EntryState } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AppWebsocket,
  EntryHash,
  InstalledAppInfo,
  InstalledCell,
  Record,
} from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { Task } from '@lit-labs/task';
import { decode } from '@msgpack/msgpack';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  Button,
  Card,
  CircularProgress,
  Formfield,
  Icon,
  IconButton,
  List,
  ListItem,
  Snackbar,
} from '@scoped-elements/material-web';
import { SlSkeleton } from '@scoped-elements/shoelace';
import { LitElement, html } from 'lit';
import { TaskSubscriber } from 'lit-svelte-stores';
import { customElement, property, state } from 'lit/decorators.js';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { Event } from '../types';
import { AttendeesForEvent } from './attendees-for-event';
import { EditEvent } from './edit-event';

export class EventDetail extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchEvent = new TaskSubscriber(
    this,
    ([store, eventHash]) => store.fetchEvent(eventHash),
    () => [this.gatherStore, this.eventHash] as [GatherStore, ActionHash]
  );

  _fetchAttendees = new TaskSubscriber(
    this,
    ([store, eventHash]) => store.fetchAttendeesForEvent(eventHash),
    () => [this.gatherStore, this.eventHash] as [GatherStore, ActionHash]
  );

  @state()
  _editing = false;

  async deleteEvent() {
    try {
      await this.gatherStore.deleteEvent(this.eventHash);

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
      await this.gatherStore.addAttendeeForEvent(
        this.eventHash,
        this.gatherStore.myAgentPubKey
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
      errorSnackbar.labelText = `Error adding attendee: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  renderDetail(entryRecord: EntryRecord<Event>) {
    const amIAuthor =
      entryRecord.action.author.toString() ===
      this.gatherStore.myAgentPubKey.toString();
    return html`
      <mwc-snackbar id="error" leading> </mwc-snackbar>
      
      <mwc-card class="column">

        <show-image .imageHash=${entryRecord.entry.image}></show-image>

      <div style="display: flex; flex-direction: column; margin-left: 16px; margin-bottom: 16px;">
        <div style="display: flex; flex-direction: row">
          <span class="title" style="flex: 1; margin-top: 16px; margin-bottom: 16px;">${entryRecord.entry.title}</span>

          ${amIAuthor
        ? html`
                <mwc-icon-button
                  style="margin-left: 8px"
                  icon="edit"
                  @click=${() => {
            this._editing = true;
          }}
                ></mwc-icon-button>
                <mwc-icon-button
                  style="margin-left: 8px"
                  icon="delete"
                  @click=${() => this.deleteEvent()}
                ></mwc-icon-button>
              `
        : html``}
        </div>

        <div style="display: flex; flex-direction: column; margin-right: 16px">
        <span style="white-space: pre-line; margin-bottom: 16px;"
          >${entryRecord.entry.description}</span
        >

        <div style="display: flex; flex-direction: row;">

      <div class="column" style="justify-content: end">      
        <div style="display: flex; flex-direction: row; align-items: center;">
          <mwc-icon>location_on</mwc-icon>
          <span style="white-space: pre-line"
            >${entryRecord.entry.location}</span
          >
        </div>

        <div style="display: flex; flex-direction: row; align-items: center">
          <mwc-icon>schedule</mwc-icon>
          <span style="white-space: pre-line"
            >${new Date(
          entryRecord.entry.start_time / 1000
        ).toLocaleString()}</span
          >
        </div>
      
        ${entryRecord.entry.cost ? html`
        <div style="display: flex; flex-direction: row; align-items: center">
          <mwc-icon>payments</mwc-icon>
          <span style="white-space: pre-line"
            >${entryRecord.entry.cost}</span
          >
        </div>`: html``} 
        </div>

          <span style="flex: 1"></span>
 
          <div class="column" style="justify-content: end">
          <div class="row" style="align-items: center; margin-bottom: 8px;">
            <span style="margin-right: 8px">Hosted by</span>
            <agent-avatar .agentPubKey=${entryRecord.action.author}></agent-avatar>
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
    return this._fetchAttendees.render({
      pending: () => html`<sl-skeleton style="margin-top: 16px;" effect="pulse"></sl-skeleton>`,
      complete: attendees => {
        if (
          event.action.author.toString() ===
          this.gatherStore.myAgentPubKey.toString()
        )
          return html``;
        if (
          attendees
            .map(a => a.toString())
            .includes(this.gatherStore.myAgentPubKey.toString())
        )
          return html``;
        return html`<mwc-button
          style="margin-top: 16px;"
          raised
          label="I'll attend!"
          @click=${() => this.attendEvent()}
        ></mwc-button>`;
      },
    });
  }

  renderEvent(maybeEntryState: EntryState<Event> | undefined) {
    if (!maybeEntryState)
      return html`<span>The requested event doesn't exist</span>`;

    if (this._editing) {
      return html`<edit-event
        .originalEventHash=${this.eventHash}
        .currentRecord=${maybeEntryState.lastUpdate}
        @event-updated=${async () => {
          this._editing = false;
        }}
        @edit-canceled=${() => {
          this._editing = false;
        }}
        style="display: flex; flex: 1;"
      ></edit-event>`;
    }

    return html`<div class="row">${this.renderDetail(maybeEntryState.lastUpdate)}
        <attendees-for-event
      style="margin-left: 16px;"
          .eventHash=${this.eventHash}
        ></attendees-for-event>
    </div>      `;
  }

  render() {
    return this._fetchEvent.render({
      pending: () => html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`,
      complete: entry => this.renderEvent(entry),
      error: (e: any) =>
        html`<span>Error fetching the event: ${e.data.data}</span>`,
    });
  }

  static get scopedElements() {
    return {
      'edit-event': EditEvent,
      'mwc-icon': Icon,
      'mwc-snackbar': Snackbar,
      'mwc-card': Card,
      'mwc-icon-button': IconButton,
      'agent-avatar': AgentAvatar,
      'mwc-button': Button,
      'sl-skeleton': SlSkeleton,
      'show-image': ShowImage,
      'attendees-for-event': AttendeesForEvent,
    };
  }

  static styles = [sharedStyles];
}
