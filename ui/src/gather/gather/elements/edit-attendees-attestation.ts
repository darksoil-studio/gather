import { hashProperty, hashState } from '@holochain-open-dev/elements';
import { SearchAgent } from '@holochain-open-dev/profiles';
import { EntryRecord, RecordBag } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppWebsocket,
  InstalledAppInfo,
  InstalledCell,
  Record,
} from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { decode } from '@msgpack/msgpack';
import { Button, Snackbar } from '@scoped-elements/material-web';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { AttendeesAttestation } from '../types';

export class EditAttendeesAttestation extends LitElement {
  @property(hashProperty('original-attendees-attestation-hash'))
  originalAttendeesAttestationHash!: ActionHash;

  @property()
  currentRecord!: EntryRecord<AttendeesAttestation>;

  @contextProvided({ context: gatherStoreContext })
  gatherStore!: GatherStore;

  @state()
  _ateendees: Array<AgentPubKey | undefined> =
    this.currentRecord.entry.ateendees;

  isAttendeesAttestationValid() {
    return true && this._ateendees.every(e => e !== undefined);
  }

  async updateAttendeesAttestation() {
    const attendeesAttestation: AttendeesAttestation = {
      ateendees: this._ateendees as Array<AgentPubKey>,
      event_hash: this.currentRecord.entry.event_hash,
    };

    try {
      const updateRecord = await this.gatherStore.updateAttendeesAttestation(
        this.originalAttendeesAttestationHash,
        this.currentRecord.actionHash,
        attendeesAttestation
      );

      this.dispatchEvent(
        new CustomEvent('attendees-attestation-updated', {
          composed: true,
          bubbles: true,
          detail: {
            originalAttendeesAttestationHash:
              this.originalAttendeesAttestationHash,
            previousAttendeesAttestationHash: this.currentRecord.actionHash,
            updatedAttendeesAttestationHash: updateRecord.actionHash,
          },
        })
      );
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById(
        'update-error'
      ) as Snackbar;
      errorSnackbar.labelText = `Error updating the attendees attestation: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  render() {
    return html` <mwc-snackbar id="update-error" leading> </mwc-snackbar>

      <div style="display: flex; flex-direction: column">
        <span style="font-size: 18px">Edit Attendees Attestation</span>
        <div
          style="display: flex; flex-direction: column"
          @input=${() => this.requestUpdate()}
          @change=${() => this.requestUpdate()}
        >
          <span>Ateendees</span>

          ${this._ateendees.map(
            (el, i) => html`<div style="display: flex; flex-direction: row;">
                <agent-avatar .agentPubKey=${el}></agent-avatar>
                <search-agent
                  field-label=""
                  @agent-selected=${(e: CustomEvent) => {
                    this._ateendees[i] = e.detail.agentPubKey;
                  }}
                ></search-agent>
              </div>
              }`
          )}
          <mwc-button
            icon="add"
            label="Add Ateendees"
            @click=${() => {
              this._ateendees = [...this._ateendees, undefined];
            }}
          ></mwc-button>
        </div>

        <div style="display: flex; flex-direction: row">
          <mwc-button
            outlined
            label="Cancel"
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent('edit-canceled', {
                  bubbles: true,
                  composed: true,
                })
              )}
            style="flex: 1;"
          ></mwc-button>
          <mwc-button
            raised
            label="Save"
            .disabled=${!this.isAttendeesAttestationValid()}
            @click=${() => this.updateAttendeesAttestation()}
            style="flex: 1;"
          ></mwc-button>
        </div>
      </div>`;
  }

  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-button': Button,
      'search-agent': SearchAgent,
    };
  }

  static styles = [sharedStyles];
}
