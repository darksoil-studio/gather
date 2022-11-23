import { hashProperty } from '@holochain-open-dev/elements';
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
  Snackbar,
} from '@scoped-elements/material-web';
import { LitElement, html } from 'lit';
import { TaskSubscriber } from 'lit-svelte-stores';
import { customElement, property, state } from 'lit/decorators.js';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { AttendeesAttestation } from '../types';
import { EditAttendeesAttestation } from './edit-attendees-attestation';

export class AttendeesAttestationDetail extends ScopedElementsMixin(
  LitElement
) {
  @property(hashProperty('attendees-attestation-hash'))
  attendeesAttestationHash!: ActionHash;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchAttendeesAttestation = new TaskSubscriber(
    this,
    ([store, attendeesAttestationHash]) =>
      store.fetchAttendeesAttestation(attendeesAttestationHash),
    () =>
      [this.gatherStore, this.attendeesAttestationHash] as [
        GatherStore,
        ActionHash
      ]
  );

  @state()
  _editing = false;

  renderDetail(maybeEntryRecord: EntryRecord<AttendeesAttestation>) {
    return html`
      <div style="display: flex; flex-direction: column">
        <div style="display: flex; flex-direction: row">
          <span style="font-size: 18px; flex: 1;">Attendees Attestation</span>

          <mwc-icon-button
            style="margin-left: 8px"
            icon="edit"
            @click=${() => {
              this._editing = true;
            }}
          ></mwc-icon-button>
        </div>

        <div style="display: flex; flex-direction: column">
          <span><strong>Ateendees</strong></span>
          ${maybeEntryRecord.entry.ateendees.map(
            el =>
              html`<span style="white-space: pre-line"
                ><agent-avatar .agentPubKey=${el}></agent-avatar
              ></span>`
          )}
        </div>
      </div>
    `;
  }

  renderAttendeesAttestation(
    maybeEntryState: EntryState<AttendeesAttestation> | undefined
  ) {
    if (!maybeEntryState)
      return html`<span
        >The requested attendees attestation doesn't exist</span
      >`;

    if (this._editing) {
      return html`<edit-attendees-attestation
        .currentRecord=${maybeEntryState.lastUpdate}
        @attendees-attestation-updated=${async () => {
          this._editing = false;
        }}
        @edit-canceled=${() => {
          this._editing = false;
        }}
        style="display: flex; flex: 1;"
      ></edit-attendees-attestation>`;
    }

    return this.renderDetail(maybeEntryState.lastUpdate);
  }

  render() {
    return html`<mwc-card style="display: flex; flex: 1;">
      ${this._fetchAttendeesAttestation.render({
        pending: () => html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`,
        complete: entry => this.renderAttendeesAttestation(entry),
        error: (e: any) =>
          html`<span
            >Error fetching the attendees attestation: ${e.data.data}</span
          >`,
      })}
    </mwc-card>`;
  }

  static get scopedElements() {
    return {
      'edit-attendees-attestation': EditAttendeesAttestation,
      'mwc-snackbar': Snackbar,
      'mwc-card': Card,
      'agent-avatar': AgentAvatar,
    };
  }

  static styles = [sharedStyles];
}
