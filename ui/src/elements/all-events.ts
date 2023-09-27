import { sharedStyles } from '@holochain-open-dev/elements';
import { css, html, LitElement } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { ActionHash } from '@holochain/client';
import { customElement, state } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import './event-summary.js';
import { defaultFilter, Filter } from './events-filter.js';

@localized()
@customElement('all-events')
export class AllEvents extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state()
  filter: Filter = defaultFilter();

  _allEvents = new StoreSubscriber(
    this,
    () => {
      if (this.filter.type === 'events' && this.filter.status === 'upcoming')
        return this.gatherStore.allFutureEvents;
      if (this.filter.type === 'events' && this.filter.status === 'past')
        return this.gatherStore.allPastEvents;
      if (
        this.filter.type === 'event_proposals' &&
        this.filter.status === 'upcoming'
      )
        return this.gatherStore.allFutureEventProposals;
      if (
        this.filter.type === 'event_proposals' &&
        this.filter.status === 'past'
      )
        return this.gatherStore.allPastEventProposals;
    },
    () => [this.filter]
  );

  renderCalendar(events: ActionHash[]) {
    return html`
      <gather-events-calendar
        style="flex: 1"
        .events=${events}
      ></gather-events-calendar>
    `;
  }

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span>${msg('No events found.')}</span>`;

    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div
              style="display: flex; flex-direction: column; flex: 1; gap: 16px"
            >
              ${hashes.map(
                hash => html`<event-summary .eventHash=${hash}></event-summary>`
              )}
            </div>
          </div>
        </div>
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
        return html`
          <div class="column" style="flex: 1">
            <events-filter
              .filter=${this.filter}
              @filter-changed=${(e: any) => {
                this.filter = e.detail;
              }}
            ></events-filter>
            <div style="margin: 16px; display: flex; flex: 1">
              ${this.filter.view === 'list'
                ? this.renderList(this._allEvents.value.value)
                : this.renderCalendar(this._allEvents.value.value)}
            </div>
          </div>
        `;
      case 'error':
        return html`<display-error
          .error=${this._allEvents.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
