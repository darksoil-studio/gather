import { notifyError, sharedStyles } from '@holochain-open-dev/elements';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import {
  sliceAndJoin,
  StoreSubscriber,
  toPromise,
} from '@holochain-open-dev/stores';
import { customElement, state } from 'lit/decorators.js';

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

  @state()
  committing = false;

  async clearCallsToAction(eventsHashes: ActionHash[]) {
    if (this.committing) return;

    this.committing = true;

    try {
      const events = await toPromise(
        sliceAndJoin(this.gatherStore.events, eventsHashes)
      );

      const callsToActionHashes = Array.from(events.values()).map(
        e => e.record.entry.call_to_action_hash
      );
      await this.gatherStore.assembleStore.client.clearCallsToAction(
        callsToActionHashes
      );
    } catch (e: any) {
      notifyError(msg('Error clearing the expired calls to action.'));
      console.error(e);
    }
    this.committing = false;
  }

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span class="placeholder">${msg('No events found.')}</span>`;

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
        const upcoming = this._events.value.value.upcoming;
        const cancelled = this._events.value.value.cancelled;
        const past = this._events.value.value.past;
        return html`
          <div class="column">
            <span class="title" style="margin-bottom: 16px"
              >${msg('Upcoming')}</span
            >
            ${this.renderList(upcoming)}
            <sl-divider></sl-divider>
            <div class="row" style="margin-bottom: 16px; align-items: center">
              <span class="title" style="flex: 1">${msg('Cancelled')}</span>
              <sl-button @click=${() => this.clearCallsToAction(cancelled)}
                >${msg('Clear')}</sl-button
              >
            </div>
            ${this.renderList(cancelled)}
            <sl-divider></sl-divider>
            <span class="title" style="margin-bottom: 16px;"
              >${msg('Past')}</span
            >
            ${this.renderList(past)}
          </div>
        `;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the events for this agent')}
          .error=${this._events.value.error}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
