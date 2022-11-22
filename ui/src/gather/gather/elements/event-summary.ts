import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { InstalledCell, AppWebsocket, EntryHash, Record, ActionHash, InstalledAppInfo } from '@holochain/client';
import { RecordBag, EntryRecord } from '@holochain-open-dev/utils';
import { TaskSubscriber } from 'lit-svelte-stores';
import { EntryState } from '@holochain-open-dev/utils';
import { hashProperty } from '@holochain-open-dev/elements';
import { contextProvided } from '@lit-labs/context';
import { Task } from '@lit-labs/task';
import { decode } from '@msgpack/msgpack';
import { CircularProgress, Card, Button, Snackbar } from '@scoped-elements/material-web';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { ShowImage } from '@holochain-open-dev/file-storage';

import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { Event } from '../types';
import { sharedStyles } from '../../../shared-styles';

export class EventSummary extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchEvent = new TaskSubscriber(this, 
    ([store, eventHash]) => store.fetchEvent(eventHash), 
    () => [this.gatherStore, this.eventHash] as [GatherStore, ActionHash]
  );

  async deleteEvent() {
    try {
      await this.gatherStore.deleteEvent(this.eventHash);
 
      this.dispatchEvent(new CustomEvent('event-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          eventHash: this.eventHash
        }
      }));
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById('delete-error') as Snackbar;
      errorSnackbar.labelText = `Error deleting the event: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  renderSummary(maybeEntryRecord: EntryRecord<Event>) {
    return html`
      <mwc-snackbar id="delete-error" leading>
      </mwc-snackbar>

      <div style="display: flex; flex-direction: column">
      	<div style="display: flex; flex-direction: row">
          <span style="font-size: 18px; flex: 1;">Event</span>

          <mwc-icon-button style="margin-left: 8px" icon="delete" @click=${() => this.deleteEvent()}></mwc-icon-button>
        </div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>Title</strong></span>
 	  <span style="white-space: pre-line">${ maybeEntryRecord.entry.title }</span>
	</div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>Description</strong></span>
 	  <span style="white-space: pre-line">${ maybeEntryRecord.entry.description }</span>
	</div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>Image</strong></span>
 	  <span style="white-space: pre-line"><show-image .imageHash=${ maybeEntryRecord.entry.image } ></show-image></span>
	</div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>Location</strong></span>
 	  <span style="white-space: pre-line">${ maybeEntryRecord.entry.location }</span>
	</div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>Start Time</strong></span>
 	  <span style="white-space: pre-line">${new Date(maybeEntryRecord.entry.start_time / 1000).toLocaleString() }</span>
	</div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>End Time</strong></span>
 	  <span style="white-space: pre-line">${new Date(maybeEntryRecord.entry.end_time / 1000).toLocaleString() }</span>
	</div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>Private</strong></span>
 	  <span style="white-space: pre-line">${ maybeEntryRecord.entry.private ? 'Yes' : 'No' }</span>
	</div>

 	<div style="display: flex; flex-direction: row">
	  <span><strong>Cost</strong></span>
 	  <span style="white-space: pre-line">${ maybeEntryRecord.entry.cost }</span>
	</div>

      </div>
    `;
  }
  
  renderEvent(maybeEntryState: EntryState<Event> | undefined) {
    if (!maybeEntryState) return html`<span>The requested event doesn't exist</span>`;

    return this.renderSummary(maybeEntryState.lastUpdate);
  }

  render() {
    return html`<mwc-card style="display: flex; flex: 1;">
      ${this._fetchEvent.render({
        pending: () => html`<div style="display: flex; flex: 1; align-items: center; justify-content: center">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`,
        complete: (entry) => this.renderEvent(entry),
        error: (e: any) => html`<span>Error fetching the event: ${e.data.data}</span>`
      })}
    </mwc-card>`;
  }
  
  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-card': Card,
                  'show-image': ShowImage,                                  };
  }
  
  static styles = [sharedStyles];
}
