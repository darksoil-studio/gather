import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { InstalledCell, AgentPubKey, EntryHash, ActionHash, Record, AppWebsocket, InstalledAppInfo } from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { hashProperty } from '@holochain-open-dev/elements';
import { TaskSubscriber } from 'lit-svelte-stores';
import { CircularProgress } from '@scoped-elements/material-web';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { AgentAvatar } from '@holochain-open-dev/profiles';
import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { sharedStyles } from '../../../shared-styles';

export class AttendeesForEvent extends ScopedElementsMixin(LitElement) {

  @property(hashProperty('event-hash'))
  eventHash!: ActionHash; 

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchAttendees = new TaskSubscriber(this,
    ([store, eventHash]) => store.fetchAttendeesForEvent(eventHash), 
    () => [this.gatherStore, this.eventHash] as [GatherStore, ActionHash]
  );

  renderList(hashes: Array<AgentPubKey>) {
    if (hashes.length === 0) return html`<span>No attendees found for this event</span>`;
    
    return html`
      <div style="display: flex; flex-direction: column">
        ${hashes.map(hash => 
          html`<agent-avatar .agentPubKey=${hash}></agent-avatar>`
        )}
      </div>
    `;
  }

  render() {
    return this._fetchAttendees.render({
      pending: () => html`<div style="display: flex; flex: 1; align-items: center; justify-content: center">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: (hashes) => this.renderList(hashes),
      error: (e: any) => html`<span>Error fetching the attendees: ${e.data.data}.</span>`
    });
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'agent-avatar': AgentAvatar
    };
  }
  
  static styles = [sharedStyles];
}
