import { hashProperty } from '@holochain-open-dev/elements';
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
import { CircularProgress } from '@scoped-elements/material-web';
import { LitElement, html } from 'lit';
import { TaskSubscriber } from 'lit-svelte-stores';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { EventSummary } from './event-summary';

export class AllEvents extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _fetchAllEvents = new TaskSubscriber(
    this,
    ([store]) => store.fetchAllEvents(),
    () => [this.gatherStore] as [GatherStore]
  );

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0) return html`<span>No events found.</span>`;

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
    return this._fetchAllEvents.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: hashes => this.renderList(hashes),
      error: (e: any) =>
        html`<span>Error fetching the events: ${e.data.data}.</span>`,
    });
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'event-summary': EventSummary,
    };
  }

  static styles = [sharedStyles];
}
