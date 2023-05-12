import { hashProperty, sharedStyles } from '@holochain-open-dev/elements';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import {
  asyncDerived,
  join,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { customElement, property } from 'lit/decorators.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import './event-summary.js';

@localized()
@customElement('my-events')
export class MyEvents extends LitElement {
  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  _events = new StoreSubscriber(
    this,
    () => this.gatherStore.myEvents,
    () => []
  );

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span>${msg('No events found.')}</span>`;

    return html`
      <div style="display: flex; flex-direction: column; flex: 1;">
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
    switch (this._events.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return this.renderList(this._events.value.value);
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the events for this agent')}
          .error=${this._events.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
