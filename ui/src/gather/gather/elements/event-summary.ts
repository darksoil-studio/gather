import { hashProperty } from '@holochain-open-dev/elements';
import { ShowImage } from '@holochain-open-dev/file-storage';
import {
  AgentAvatar,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
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
import { TaskStatus } from '@lit-labs/task';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  Button,
  Card,
  CircularProgress,
  Icon,
  Snackbar,
} from '@scoped-elements/material-web';
import { LitElement, css, html } from 'lit';
import { TaskSubscriber } from 'lit-svelte-stores';
import { property } from 'lit/decorators.js';
import { readable } from 'svelte/store';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { Event } from '../types';

export class EventSummary extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  profilesStore!: ProfilesStore;

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

  renderSummary(entryRecord: EntryRecord<Event>) {
    return html`
      <div style="display: flex; flex-direction: row;">
        <div
          style="display: flex; flex-direction: column; flex: 1; margin: 16px"
        >
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
                <mwc-icon>location_on</mwc-icon>
                <span style="white-space: pre-line"
                  >${entryRecord.entry.location}</span
                >
              </div>

              <div
                style="display: flex; flex-direction: row; align-items: center"
              >
                <mwc-icon>schedule</mwc-icon>
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
                <span style="margin-right: 8px">Hosted by</span>
                <agent-avatar
                  .agentPubKey=${entryRecord.action.author}
                ></agent-avatar>
              </div>

              ${this._fetchAttendees.status === TaskStatus.COMPLETE
                ? html`<div class="row" style="align-items: center;">
                    <span style="margin-right: 8px;">Attendees</span>
                    <div class="avatar-group">
                      ${this._fetchAttendees.value?.map(
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
          style="width: 200px; height: 200px; flex: 0"
          .imageHash=${entryRecord.entry.image}
        ></show-image>
      </div>
    `;
  }

  renderEvent(maybeEntryState: EntryState<Event> | undefined) {
    if (!maybeEntryState)
      return html`<span>The requested event doesn't exist</span>`;

    return this.renderSummary(maybeEntryState.lastUpdate);
  }

  render() {
    return html`<mwc-card
      style="display: flex; flex: 1;"
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
      ${this._fetchEvent.render({
        pending: () => html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`,
        complete: entry => this.renderEvent(entry),
        error: (e: any) =>
          html`<span>Error fetching the event: ${e.data.data}</span>`,
      })}
    </mwc-card>`;
  }

  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-card': Card,
      'mwc-icon': Icon,
      'show-image': ShowImage,
      'agent-avatar': AgentAvatar,
    };
  }

  static styles = [
    sharedStyles,
    css`
      .avatar-group agent-avatar:not(:first-of-type) {
        margin-left: -1rem;
      }
    `,
  ];
}
