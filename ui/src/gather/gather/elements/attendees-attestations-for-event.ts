import { hashProperty } from '@holochain-open-dev/elements';
import { EntryRecord, RecordBag } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppWebsocket,
  EntryHash,
  InstalledAppInfo,
  InstalledCell,
  Record,
} from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { CircularProgress } from '@scoped-elements/material-web';
import { LitElement, html } from 'lit';
import { TaskSubscriber } from 'lit-svelte-stores';
import { customElement, property, state } from 'lit/decorators.js';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { AttendeesAttestation } from '../types';
import { AttendeesAttestationDetail } from './attendees-attestation-detail';

export class AttendeesAttestationsForEvent extends ScopedElementsMixin(
  LitElement
) {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchAttendeesAttestations = new TaskSubscriber(
    this,
    ([store, eventHash]) => store.fetchAttendeesAttestationsForEvent(eventHash),
    () => [this.gatherStore, this.eventHash] as [GatherStore, ActionHash]
  );

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span>No attendees attestations found for this event.</span>`;

    return html`
      <div style="display: flex; flex-direction: column">
        ${hashes.map(
          hash =>
            html`<attendees-attestation-detail
              .attendeesAttestationHash=${hash}
            ></attendees-attestation-detail>`
        )}
      </div>
    `;
  }

  render() {
    return this._fetchAttendeesAttestations.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: hashes => this.renderList(hashes),
      error: (e: any) =>
        html`<span
          >Error fetching attendees attestations: ${e.data.data}.</span
        >`,
    });
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'attendees-attestation-detail': AttendeesAttestationDetail,
    };
  }

  static styles = [sharedStyles];
}
