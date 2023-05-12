import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { AgentPubKey, EntryHash, ActionHash, Record } from '@holochain/client';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import {
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { mdiInformationOutline } from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

import './event-summary.js';
import { GatherStore } from '../gather-store.js';
import { gatherStoreContext } from '../context.js';

/**
 * @element events-by-author
 */
@localized()
@customElement('events-by-author')
export class EventsByAuthor extends LitElement {
  // REQUIRED. The author for which the Events should be fetched
  @property(hashProperty('author'))
  author!: AgentPubKey;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  _eventsByAuthor = new StoreSubscriber(
    this,
    () => this.gatherStore.eventsByAuthor.get(this.author),
    () => [this.author]
  );

  firstUpdated() {
    if (this.author === undefined) {
      throw new Error(
        `The author property is required for the EventsByAuthor element`
      );
    }
  }

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html` <div class="column center-content">
        <sl-icon
          .src=${wrapPathInSvg(mdiInformationOutline)}
          style="color: grey; height: 64px; width: 64px; margin-bottom: 16px"
        ></sl-icon>
        <span class="placeholder">${msg('No events found')}</span>
      </div>`;

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
    switch (this._eventsByAuthor.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem;"></sl-spinner>
        </div>`;
      case 'complete':
        return this.renderList(this._eventsByAuthor.value.value);
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the events')}
          .error=${this._eventsByAuthor.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
