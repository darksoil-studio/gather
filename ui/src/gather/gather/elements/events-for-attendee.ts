import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { InstalledCell, AgentPubKey, EntryHash, ActionHash, Record, AppWebsocket, InstalledAppInfo } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { TaskSubscriber } from 'lit-svelte-stores';
import { hashProperty } from '@holochain-open-dev/elements';
import { CircularProgress } from '@scoped-elements/material-web';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { EventSummary } from './event-summary';
import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { sharedStyles } from '../../../shared-styles';

export class EventsForAttendee extends ScopedElementsMixin(LitElement) {

  @property(hashProperty('attendee'))
  attendee!: AgentPubKey; 

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchEvents = new TaskSubscriber(this,
    ([store, attendee]) => store.fetchEventsForAttendee(attendee), 
    () => [this.gatherStore, this.attendee] as [GatherStore, AgentPubKey]
  );

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0) return html`<span>No events found for this attendee</span>`;
    
    return html`
      <div style="display: flex; flex-direction: column">
        ${hashes.map(hash => 
          html`<event-summary .eventHash=${hash} style="margin-bottom: 16px;"></event-summary>`
        )}
      </div>
    `;
  }

  render() {
    return this._fetchEvents.render({
      pending: () => html`<div style="display: flex; flex: 1; align-items: center; justify-content: center">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: (hashes) => this.renderList(hashes),
      error: (e: any) => html`<span>Error fetching the events: ${e.data.data}.</span>`
    });
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'event-summary': EventSummary,
    };
  }
  
  static styles = [sharedStyles];
}
