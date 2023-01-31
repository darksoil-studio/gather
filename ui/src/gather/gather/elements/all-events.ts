import { DisplayError, sharedStyles } from "@holochain-open-dev/elements";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import {
  ActionHash,
  AgentPubKey,
  AppWebsocket,
  EntryHash,
  InstalledCell,
  Record,
} from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { LitElement, html } from "lit";

import { gatherStoreContext } from "../context";
import { GatherStore } from "../gather-store";
import { EventSummary } from "./event-summary";

@localized()
export class AllEvents extends ScopedElementsMixin(LitElement) {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _allEvents = new StoreSubscriber(this, () => this.gatherStore.allEvents);

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span>${msg("No events found.")}"</span>`;

    return html`
      <div style="display: flex; flex-direction: column; flex: 1">
        ${hashes.map(
          (hash) =>
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
      case "pending":
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "complete":
        return this.renderList(this._allEvents.value.value);
      case "error":
        return html`<display-error
          .error=${this._allEvents.value.error.data.data}
        ></display-error>`;
    }
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      "display-error": DisplayError,
      "event-summary": EventSummary,
    };
  }

  static styles = [sharedStyles];
}
