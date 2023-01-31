import {
  DisplayError,
  hashProperty,
  sharedStyles,
} from "@holochain-open-dev/elements";
import {
  ActionHash,
  AgentPubKey,
  AppWebsocket,
  EntryHash,
  Record,
} from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { CircularProgress } from "@scoped-elements/material-web";
import { LitElement, html } from "lit";
import { StoreSubscriber } from "@holochain-open-dev/stores";
import { customElement, property, state } from "lit/decorators.js";

import { gatherStoreContext } from "../context";
import { GatherStore } from "../gather-store";
import { EventSummary } from "./event-summary";

@localized()
export class EventsForAttendee extends ScopedElementsMixin(LitElement) {
  @property(hashProperty("attendee"))
  attendee!: AgentPubKey;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  _events = new StoreSubscriber(this, () =>
    this.gatherStore.eventsForAttendee.get(this.attendee)
  );

  renderList(hashes: Array<ActionHash>) {
    if (hashes.length === 0)
      return html`<span>${msg("No events found for this attendee")}</span>`;

    return html`
      <div style="display: flex; flex-direction: column">
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
    switch (this._events.value.status) {
      case "pending":
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "complete":
        return this.renderList(this._events.value.value);
      case "error":
        return html`<display-error
          .error=${this._events.value.error.data.data}
        ></display-error>`;
    }
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      "event-summary": EventSummary,
      "display-error": DisplayError,
    };
  }

  static styles = [sharedStyles];
}
