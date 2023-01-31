import {
  DisplayError,
  hashProperty,
  sharedStyles,
} from "@holochain-open-dev/elements";
import { ShowImage } from "@holochain-open-dev/file-storage";
import {
  AgentAvatar,
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";
import { EntryRecord } from "@holochain-open-dev/utils";
import { AsyncStatus, StoreSubscriber } from "@holochain-open-dev/stores";
import { ActionHash, EntryHash, Record } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { TaskStatus } from "@lit-labs/task";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  Button,
  Card,
  CircularProgress,
  Icon,
  Snackbar,
} from "@scoped-elements/material-web";
import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";

import { gatherStoreContext } from "../context";
import { GatherStore } from "../gather-store";
import { Event } from "../types";

@localized()
export class EventSummary extends ScopedElementsMixin(LitElement) {
  @property(hashProperty("event-hash"))
  eventHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  @consume({ context: profilesStoreContext, subscribe: true })
  profilesStore!: ProfilesStore;

  /**
   * @internal
   */
  _event = new StoreSubscriber(this, () =>
    this.gatherStore.events.get(this.eventHash)
  );

  /**
   * @internal
   */
  _attendees = new StoreSubscriber(this, () =>
    this.gatherStore.attendeesForEvent.get(this.eventHash)
  );

  renderSummary(entryRecord: EntryRecord<Event>) {
    return html`
      <div style="display: flex; flex-direction: row;">
        <div
          style="display: flex; flex-direction: column; flex: 1; margin: 16px"
        >
          <span class="title">${entryRecord.entry.title}</span>

          <span style="white-space: pre-line"
            >${entryRecord.entry.description}</span
          >

          <span style="flex: 1"></span>

          <div style="display: flex; flex-direction: row;">
            <div class="column" style="justify-content: end">
              <div
                style="display: flex; flex-direction: row; align-items: center;"
              >
                <mwc-icon>location_on</mwc-icon>
                <span style="white-space: pre-line"
                  >${entryRecord.entry.location}</span
                >
              </div>

              <div
                style="display: flex; flex-direction: row; align-items: center"
              >
                <mwc-icon>schedule</mwc-icon>
                <span style="white-space: pre-line"
                  >${new Date(
                    entryRecord.entry.start_time / 1000
                  ).toLocaleString()}</span
                >
              </div>
            </div>

            <span style="flex: 1"></span>

            <div class="column">
              <div class="row" style="align-items: center; margin-bottom: 8px;">
                <span style="margin-right: 8px">${msg("Hosted by")}</span>
                <agent-avatar
                  .agentPubKey=${entryRecord.action.author}
                ></agent-avatar>
              </div>

              ${this._attendees.value.status === "complete"
                ? html`<div class="row" style="align-items: center;">
                    <span style="margin-right: 8px;">${msg("Attendees")}</span>
                    <div class="avatar-group">
                      ${this._attendees.value.value.map(
                        (a) =>
                          html`<agent-avatar .agentPubKey=${a}></agent-avatar>`
                      )}
                    </div>
                  </div>`
                : html``}
            </div>
          </div>
        </div>

        <show-image
          style="width: 200px; height: 200px; flex: 0"
          .imageHash=${entryRecord.entry.image}
        ></show-image>
      </div>
    `;
  }

  renderEvent(event: AsyncStatus<EntryRecord<Event> | undefined>) {
    switch (event.status) {
      case "pending":
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "complete":
        if (!event.value)
          return html`<span>${msg("The requested event doesn't exist")}</span>`;

        return this.renderSummary(event.value);
      case "error":
        return html`<display-error
          .error=${event.error.data.data}
        ></display-error>`;
    }
  }

  render() {
    return html`<mwc-card
      style="display: flex; flex: 1;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent("event-selected", {
            bubbles: true,
            composed: true,
            detail: {
              eventHash: this.eventHash,
            },
          })
        )}
    >
      ${this.renderEvent(this._event.value)}
    </mwc-card>`;
  }

  static get scopedElements() {
    return {
      "mwc-snackbar": Snackbar,
      "mwc-card": Card,
      "mwc-icon": Icon,
      "mwc-circular-progress": CircularProgress,
      "display-error": DisplayError,
      "show-image": ShowImage,
      "agent-avatar": AgentAvatar,
    };
  }

  static styles = [
    sharedStyles,
    css`
      .avatar-group agent-avatar:not(:first-of-type) {
        margin-left: -1rem;
      }
    `,
  ];
}
