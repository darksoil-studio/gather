import {
  DisplayError,
  hashProperty,
  sharedStyles,
} from "@holochain-open-dev/elements";
import {
  AgentAvatar,
  ProfilesStore,
  profilesStoreContext,
} from "@holochain-open-dev/profiles";
import {
  asyncDeriveStore,
  joinMap,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { slice } from "@holochain-open-dev/utils";
import { ActionHash, AgentPubKey } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  Card,
  CircularProgress,
  List,
  ListItem,
} from "@scoped-elements/material-web";
import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";

import { gatherStoreContext } from "../context";
import { GatherStore } from "../gather-store";

@localized()
export class AttendeesForEvent extends ScopedElementsMixin(LitElement) {
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
  _attendees = new StoreSubscriber(this, () =>
    this.gatherStore.attendeesForEvent.get(this.eventHash)
  );

  /**
   * @internal
   */
  _profiles = new StoreSubscriber(this, () =>
    asyncDeriveStore([this._attendees.store()!], ([agentPubKeys]) =>
      joinMap(slice(this.profilesStore.agentsProfiles, agentPubKeys))
    )
  );

  renderList(hashes: Array<AgentPubKey>) {
    if (hashes.length === 0)
      return html`<span style="margin: 16px"
        >${msg("This event has no attendees yet")}</span
      >`;

    switch (this._profiles.value.status) {
      case "pending":
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "complete":
        const profiles = this._profiles.value.value;
        return html`
          <mwc-list style="display: flex; flex-direction: column">
            ${hashes.map(
              (pubkey) => html`<mwc-list-item graphic="avatar" noninteractive>
                <agent-avatar
                  size="40"
                  slot="graphic"
                  .agentPubKey=${pubkey}
                ></agent-avatar>
                <span>${profiles.get(pubkey)?.nickname}</span>
              </mwc-list-item>`
            )}
          </mwc-list>
        `;
      case "error":
        return html`<display-error
          .error=${this._profiles.value.error.data.data}
        ></display-error>`;
    }
  }

  render() {
    switch (this._attendees.value.status) {
      case "pending":
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <mwc-circular-progress indeterminate></mwc-circular-progress>
        </div>`;
      case "complete":
        return html`
          <mwc-card style="flex: 1; display: flex;">
            <div class="column">
              <span
                class="title"
                style="margin-left: 16px; margin-top: 16px; margin-bottom: 8px"
                >${msg("Attendees")}</span
              >
              ${this.renderList(this._attendees.value.value)}
            </div>
          </mwc-card>
        `;
      case "error":
        return html`<display-error
          .error=${this._attendees.value.error.data.data}
        ></display-error>`;
    }
  }

  static get scopedElements() {
    return {
      "mwc-circular-progress": CircularProgress,
      "agent-avatar": AgentAvatar,
      "mwc-list": List,
      "mwc-list-item": ListItem,
      "display-error": DisplayError,
      "mwc-card": Card,
    };
  }

  static styles = [sharedStyles];
}
