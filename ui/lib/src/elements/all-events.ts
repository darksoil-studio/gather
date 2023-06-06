import { sharedStyles } from '@holochain-open-dev/elements';
import { html, LitElement } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { ActionHash } from '@holochain/client';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import './event-summary';

@localized()
@customElement('all-events')
export class AllEvents extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _allEvents = new StoreSubscriber(
    this,
    () => this.gatherStore.allFutureEvents,
    () => []
  );

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span>${msg('No events found.')}</span>`;

    return html`
      <div style="display: flex; flex-direction: column; flex: 1">
        ${hashes.map(
          hash =>
            html`<event-summary
              .eventHash=${hash}
              style="margin-bottom: 16px;"
            ></event-summary>`
        )}
      </div>
    `;
  }

  render() {
    switch (this._allEvents.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return this.renderList(this._allEvents.value.value);
      case 'error':
        return html`<display-error
          .error=${this._allEvents.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
