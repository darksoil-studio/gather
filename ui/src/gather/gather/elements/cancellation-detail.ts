import { LitElement, html } from 'lit';
import { state, property, customElement } from 'lit/decorators.js';
import { EntryHash, Record, ActionHash } from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { sharedStyles, hashProperty, wrapPathInSvg, notifyError } from '@holochain-open-dev/elements';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiPencil, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';

import './edit-cancellation.js';

import { GatherStore } from '../gather-store.js';
import { gatherStoreContext } from '../context.js';
import { Cancellation } from '../types.js';

/**
 * @element cancellation-detail
 * @fires cancellation-deleted: detail will contain { cancellationHash }
 */
@localized()
@customElement('cancellation-detail')
export class CancellationDetail extends LitElement {

  // REQUIRED. The hash of the Cancellation to show
  @property(hashProperty('cancellation-hash'))
  cancellationHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
   _cancellation = new StoreSubscriber(this, () => this.gatherStore.cancellations.get(this.cancellationHash));

  /**
   * @internal
   */
  @state()
  _editing = false;

  async deleteCancellation() {
    try {
      await this.gatherStore.client.deleteCancellation(this.cancellationHash);
 
      this.dispatchEvent(new CustomEvent('cancellation-deleted', {
        bubbles: true,
        composed: true,
        detail: {
          cancellationHash: this.cancellationHash
        }
      }));
    } catch (e: any) {
      notifyError(msg("Error deleting the cancellation"));
      console.error(e);
    }
  }

  renderDetail(entryRecord: EntryRecord<Cancellation>) {
    return html`<sl-card>
      	<div slot="header" style="display: flex; flex-direction: row">
          <span style="font-size: 18px; flex: 1;">${msg("Cancellation")}</span>

          <sl-icon-button style="margin-left: 8px" .src=${wrapPathInSvg(mdiPencil)} @click=${() => { this._editing = true; } }></sl-icon-button>
          <sl-icon-button style="margin-left: 8px" .src=${wrapPathInSvg(mdiDelete)} @click=${() => this.deleteCancellation()}></sl-icon-button>
        </div>

        <div style="display: flex; flex-direction: column">
  
          <div style="display: flex; flex-direction: column; margin-bottom: 16px">
	    <span style="margin-bottom: 8px"><strong>${msg("Reason")}</strong></span>
 	    <span style="white-space: pre-line">${ entryRecord.entry.reason }</span>
	  </div>

      </div>
      </sl-card>
    `;
  }
  
  render() {
    switch (this._cancellation.value.status) {
      case "pending":
        return html`<sl-card>
          <div
            style="display: flex; flex: 1; align-items: center; justify-content: center"
          >
            <sl-spinner style="font-size: 2rem;"></sl-spinner>
          </div>
        </sl-card>`;
      case "complete":
        const cancellation = this._cancellation.value.value;
        
        if (!cancellation) return html`<span>${msg("The requested cancellation doesn't exist")}</span>`;
    
        if (this._editing) {
    	  return html`<edit-cancellation
    	    .currentRecord=${ cancellation }
            @cancellation-updated=${async () => { this._editing = false; } }
      	    @edit-canceled=${() => { this._editing = false; } }
    	    style="display: flex; flex: 1;"
    	  ></edit-cancellation>`;
      }

        return this.renderDetail(cancellation);
      case "error":
        return html`<sl-card>
          <display-error
            .headline=${msg("Error fetching the cancellation")}
            .error=${this._cancellation.value.error.data.data}
          ></display-error>
        </sl-card>`;
    }
  }
  
  static styles = [sharedStyles];
}
