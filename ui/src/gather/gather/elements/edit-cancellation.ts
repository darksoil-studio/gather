import { LitElement, html } from 'lit';
import { repeat } from "lit/directives/repeat.js";
import { state, customElement, property } from 'lit/decorators.js';
import { ActionHash, Record, EntryHash, AgentPubKey } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { hashState, notifyError, sharedStyles, hashProperty, wrapPathInSvg, onSubmit } from '@holochain-open-dev/elements';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';

import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { Cancellation } from '../types';

/**
 * @element edit-cancellation
 * @fires cancellation-updated: detail will contain { previousCancellationHash, updatedCancellationHash }
 */
@localized()
@customElement('edit-cancellation')
export class EditCancellation extends LitElement {

  
  // REQUIRED. The current Cancellation record that should be updated
  @property()
  currentRecord!: EntryRecord<Cancellation>;
  
  /**
   * @internal
   */
  @consume({ context: gatherStoreContext })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  @state()
  committing = false;
   

  firstUpdated() {
    this.shadowRoot?.querySelector('form')!.reset();
  }

  async updateCancellation(fields: any) {  
    const cancellation: Cancellation = { 
      reason: fields.reason,
      event_hash: this.currentRecord.entry.event_hash,
    };

    try {
      this.committing = true;
      const updateRecord = await this.gatherStore.client.updateCancellation(
        this.currentRecord.actionHash,
        cancellation
      );
  
      this.dispatchEvent(new CustomEvent('cancellation-updated', {
        composed: true,
        bubbles: true,
        detail: {
          previousCancellationHash: this.currentRecord.actionHash,
          updatedCancellationHash: updateRecord.actionHash
        }
      }));
    } catch (e: any) {
      console.error(e);
      notifyError(msg("Error updating the cancellation"));
    }
    
    this.committing = false;
  }

  render() {
    return html`
      <sl-card>
        <span slot="header">${msg("Edit Cancellation")}</span>

        <form 
          style="display: flex; flex: 1; flex-direction: column;"
          ${onSubmit(fields => this.updateCancellation(fields))}
        >  
          <div style="margin-bottom: 16px">
        <sl-textarea name="reason" .label=${msg("Reason")}  required .defaultValue=${ this.currentRecord.entry.reason }></sl-textarea>          </div>



          <div style="display: flex; flex-direction: row">
            <sl-button
              @click=${() => this.dispatchEvent(new CustomEvent('edit-canceled', {
                bubbles: true,
                composed: true
              }))}
              style="flex: 1;"
            >${msg("Cancel")}</sl-button>
            <sl-button
              type="submit"
              variant="primary"
              style="flex: 1;"
              .loading=${this.committing}
            >${msg("Save")}</sl-button>

          </div>
        </form>
      </sl-card>`;
  }

  static styles = [sharedStyles];
}
