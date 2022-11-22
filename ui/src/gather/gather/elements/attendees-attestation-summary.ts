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

import { AgentAvatar } from '@holochain-open-dev/profiles';


import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { AttendeesAttestation } from '../types';
import { sharedStyles } from '../../../shared-styles';

export class AttendeesAttestationSummary extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('attendees-attestation-hash'))
  attendeesAttestationHash!: ActionHash;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchAttendeesAttestation = new TaskSubscriber(this, 
    ([store, attendeesAttestationHash]) => store.fetchAttendeesAttestation(attendeesAttestationHash), 
    () => [this.gatherStore, this.attendeesAttestationHash] as [GatherStore, ActionHash]
  );


  renderSummary(maybeEntryRecord: EntryRecord<AttendeesAttestation>) {
    return html`
      <div style="display: flex; flex-direction: column">
      	<div style="display: flex; flex-direction: row">
          <span style="font-size: 18px; flex: 1;">Attendees Attestation</span>

        </div>

          <div style="display: flex; flex-direction: column">
            <span><strong>Ateendees</strong></span>
            ${ maybeEntryRecord.entry.ateendees.map(el => html`<span style="white-space: pre-line"><agent-avatar .agentPubKey=${ el }></agent-avatar></span>`)}
          </div>
      </div>
    `;
  }
  
  renderAttendeesAttestation(maybeEntryState: EntryState<AttendeesAttestation> | undefined) {
    if (!maybeEntryState) return html`<span>The requested attendees attestation doesn't exist</span>`;

    return this.renderSummary(maybeEntryState.lastUpdate);
  }

  render() {
    return html`<mwc-card style="display: flex; flex: 1;">
      ${this._fetchAttendeesAttestation.render({
        pending: () => html`<div style="display: flex; flex: 1; align-items: center; justify-content: center">
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`,
        complete: (entry) => this.renderAttendeesAttestation(entry),
        error: (e: any) => html`<span>Error fetching the attendees attestation: ${e.data.data}</span>`
      })}
    </mwc-card>`;
  }
  
  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-card': Card,
      'agent-avatar': AgentAvatar,    };
  }
  
  static styles = [sharedStyles];
}
