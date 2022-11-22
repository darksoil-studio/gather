
import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { InstalledCell, Record, AppWebsocket, EntryHash, ActionHash, InstalledAppInfo, AgentPubKey } from '@holochain/client';
import { RecordBag, EntryRecord } from '@holochain-open-dev/utils';
import { hashProperty } from '@holochain-open-dev/elements';
import { contextProvided } from '@lit-labs/context';
import { CircularProgress } from '@scoped-elements/material-web';
import { TaskSubscriber } from 'lit-svelte-stores';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { AttendeesAttestation } from '../types';
import { AttendeesAttestationDetail } from './attendees-attestation-detail';
import { sharedStyles } from '../../../shared-styles';

export class AttendeesAttestationsForAteendee extends ScopedElementsMixin(LitElement) {

  @property(hashProperty('ateendee'))
  ateendee!: AgentPubKey;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchAttendeesAttestations = new TaskSubscriber(this, 
    ([store, ateendee]) => store.fetchAttendeesAttestationsForAteendee(ateendee), 
    () => [this.gatherStore, this.ateendee] as [GatherStore, AgentPubKey]
  );

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0) return html`<span>No attendees attestations found for this ateendee.</span>`;
    
    return html`
      <div style="display: flex; flex-direction: column">
        ${hashes.map(hash =>
          html`<attendees-attestation-detail .attendeesAttestationHash=${hash}></attendees-attestation-detail>`
        )}
      </div>
    `;
  }

  render() {
    return this._fetchAttendeesAttestations.render({
      pending: () => html`<div style="display: flex; flex: 1; align-items: center; justify-content: center">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: (hashes) => this.renderList(hashes),
      error: (e: any) => html`<span>Error fetching attendees attestations: ${e.data.data}.</span>`
    });
  }
  
  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'attendees-attestation-detail': AttendeesAttestationDetail
    };
  }
  
  static styles = [sharedStyles];
}
