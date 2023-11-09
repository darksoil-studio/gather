import { sharedStyles, wrapPathInSvg } from '@holochain-open-dev/elements';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { mdiInformationOutline } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import './proposal-summary.js';
import './event-summary.js';
import { defaultFilter, Filter } from './events-filter.js';
import { IndexedHash } from '../types.js';

@localized()
@customElement('my-events')
export class MyEvents extends LitElement {
  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state()
  filter: Filter = defaultFilter();

  _myEvents = new StoreSubscriber(
    this,
    () => {
      if (this.filter.type === 'all') {
        if (this.filter.status === 'upcoming')
          return this.gatherStore.myUpcoming;
        if (this.filter.status === 'past') return this.gatherStore.myPast;
        if (this.filter.status === 'cancelled')
          return this.gatherStore.myCancelled;
      } else if (this.filter.type === 'events') {
        if (this.filter.status === 'upcoming')
          return this.gatherStore.myUpcomingEvents;
        if (this.filter.status === 'past') return this.gatherStore.myPastEvents;
        if (this.filter.status === 'cancelled')
          return this.gatherStore.myCancelledEvents;
      } else {
        if (this.filter.status === 'upcoming')
          return this.gatherStore.myOpenProposals;
        if (this.filter.status === 'past')
          return this.gatherStore.myExpiredProposals;
      }
      return this.gatherStore.myCancelledProposals;
    },
    () => [this.filter]
  );

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  renderCalendar(eventsAndProposals: Array<IndexedHash>) {
    const events = eventsAndProposals
      .filter(h => h.type === 'event')
      .map(h => h.hash);
    const proposals = eventsAndProposals
      .filter(h => h.type === 'proposal')
      .map(h => h.hash);
    return html`
      <gather-events-calendar
        style="flex: 1"
        .events=${events}
        .proposals=${proposals}
      ></gather-events-calendar>
    `;
  }

  renderSummary(hash: IndexedHash) {
    if (hash.type === 'event')
      return html` <event-summary
        .eventHash=${hash.hash}
        style=${styleMap({
          width: this._isMobile ? '' : '800px',
        })}
      ></event-summary>`;

    return html` <proposal-summary
      .proposalHash=${hash.hash}
      style=${styleMap({
        width: this._isMobile ? '' : '800px',
      })}
    ></proposal-summary>`;
  }

  renderList(hashes: Array<IndexedHash>) {
    if (hashes.length === 0)
      return html` <div
        style="display: flex; align-items: center; flex-direction: column; margin: 48px; gap: 16px"
      >
        <sl-icon
          .src=${wrapPathInSvg(mdiInformationOutline)}
          style="font-size: 96px; color: grey"
          class="placeholder"
        ></sl-icon>
        <span class="placeholder"
          >${this.filter.type === 'proposals'
            ? msg('No proposals found.')
            : msg('No events found.')}</span
        >
      </div>`;

    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div
              class="column"
              style=${styleMap({
                'align-items': this._isMobile ? '' : 'center',
                flex: 1,
                gap: '16px',
                margin: '16px',
              })}
            >
              ${hashes.map(hash => this.renderSummary(hash))}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderContent() {
    switch (this._myEvents.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return this.filter.view === 'list'
          ? this.renderList(this._myEvents.value.value)
          : this.renderCalendar(this._myEvents.value.value);
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching events')}
          .error=${this._myEvents.value.error}
        ></display-error>`;
    }
  }

  render() {
    return html`
      <div class="column" style="flex: 1">
        <events-filter
          category="my_events"
          .filter=${this.filter}
          @filter-changed=${(e: any) => {
            this.filter = e.detail;
          }}
        ></events-filter>

        ${this._isMobile
          ? html``
          : html`
              <sl-divider style="margin: 0 8px; --spacing: 0"></sl-divider>
            `}
        ${this.renderContent()}
      </div>
    `;
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
