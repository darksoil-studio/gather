import { hashProperty, hashState } from '@holochain-open-dev/elements';
import { SearchAgent } from '@holochain-open-dev/profiles';
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
import { Button, Card, Snackbar } from '@scoped-elements/material-web';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { AttendeesAttestation } from '../types';

export class CreateAttendeesAttestation extends ScopedElementsMixin(
  LitElement
) {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  @state()
  _ateendees: Array<AgentPubKey | undefined> = [];

  isAttendeesAttestationValid() {
    return true && this._ateendees.every(e => e !== undefined);
  }

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  async createAttendeesAttestation() {
    const attendeesAttestation: AttendeesAttestation = {
      ateendees: this._ateendees as Array<AgentPubKey>,
      event_hash: this.eventHash,
    };

    try {
      const record: Record = await this.gatherStore.createAttendeesAttestation(
        attendeesAttestation
      );

      this.dispatchEvent(
        new CustomEvent('attendees-attestation-created', {
          composed: true,
          bubbles: true,
          detail: {
            attendeesAttestationHash: record.signed_action.hashed.hash,
          },
        })
      );
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById(
        'create-error'
      ) as Snackbar;
      errorSnackbar.labelText = `Error creating the attendees attestation: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  render() {
    return html`
      <mwc-snackbar id="create-error" leading>
      </mwc-snackbar>

      <mwc-card style="display: flex; flex: 1;">
        <div style="display: flex; flex: 1; flex-direction: column">
          <span style="font-size: 18px">Create Attendees Attestation</span>
  
          <div style="display: flex; flex-direction: column" @input=${() =>
            this.requestUpdate()} @change=${() => this.requestUpdate()}>
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
            <mwc-button icon="add" label="Add Ateendees" @click=${() => {
              this._ateendees = [...this._ateendees, undefined];
            }}></mwc-button>
          </div>


          <mwc-button 
            raised
            label="Create Attendees Attestation"
            .disabled=${!this.isAttendeesAttestationValid()}
            @click=${() => this.createAttendeesAttestation()}
          ></mwc-button>
        </mwc-card>
    </div>`;
  }

  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-button': Button,
      'mwc-card': Card,
      'search-agent': SearchAgent,
    };
  }

  static styles = [sharedStyles];
}
