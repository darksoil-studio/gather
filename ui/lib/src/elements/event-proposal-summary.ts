import {
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import {
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import { EntryRecord } from '@holochain-open-dev/utils';
import { AsyncStatus, StoreSubscriber } from '@holochain-open-dev/stores';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { mdiCalendarClock, mdiMapMarker } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@holochain-open-dev/elements/elements/display-error.js';
import '@holochain-open-dev/profiles/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';

import {
  AssembleStore,
  assembleStoreContext,
  CallToAction,
} from '@darksoil/assemble';
import { decode } from '@msgpack/msgpack';
import '@darksoil/assemble/elements/call-to-action-progress.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';

@localized()
@customElement('event-proposal-summary')
export class EventProposalSummary extends LitElement {
  @property(hashProperty('event-hash'))
  eventProposalHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  @consume({ context: assembleStoreContext, subscribe: true })
  assembleStore!: AssembleStore;

  /**
   * @internal
   */
  @consume({ context: profilesStoreContext, subscribe: true })
  profilesStore!: ProfilesStore;

  /**
   * @internal
   */
  _eventProposal = new StoreSubscriber<
    AsyncStatus<EntryRecord<CallToAction> | undefined>
  >(this, () => this.assembleStore.callToActions.get(this.eventProposalHash));

  renderSummary(entryRecord: EntryRecord<CallToAction>) {
    const customContent = decode(entryRecord.entry.custom_content) as any;
    return html`
      <div style="display: flex; flex-direction: row;">
        <div
          style="display: flex; flex-direction: column; flex: 1; margin: 16px"
        >
          <span class="title">${entryRecord.entry.title}</span>

          <span style="white-space: pre-line"
            >${customContent.description}</span
          >

          <span style="flex: 1"></span>

          <div style="display: flex; flex-direction: row;">
            <div class="column" style="justify-content: end">
              <div
                style="display: flex; flex-direction: row; align-items: center;"
              >
                <sl-icon
                  style="margin-right: 4px"
                  .src=${wrapPathInSvg(mdiMapMarker)}
                ></sl-icon>
                <span style="white-space: pre-line"
                  >${customContent.location}</span
                >
              </div>

              <div
                style="display: flex; flex-direction: row; align-items: center"
              >
                <sl-icon
                  style="margin-right: 4px"
                  .src=${wrapPathInSvg(mdiCalendarClock)}
                ></sl-icon>
                <span style="white-space: pre-line"
                  >${new Date(
                    customContent.start_time / 1000
                  ).toLocaleString()}</span
                >
              </div>
            </div>

            <span style="flex: 1"></span>

            <div class="column">
              <div class="row" style="align-items: center; margin-bottom: 8px;">
                <span style="margin-right: 8px">${msg('Hosted by')}</span>
                <agent-avatar
                  .agentPubKey=${entryRecord.action.author}
                ></agent-avatar>
              </div>
            </div>
          </div>
          <call-to-action-progress
            .callToActionHash=${this.eventProposalHash}
          ></call-to-action-progress>
        </div>

        <show-image
          style="width: 200px; height: 200px; flex: 0; margin-top: -20px; margin-bottom: -20px; margin-right: -20px"
          .imageHash=${customContent.image}
        ></show-image>
      </div>
    `;
  }

  renderEvent(event: AsyncStatus<EntryRecord<CallToAction> | undefined>) {
    switch (event.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        if (!event.value)
          return html`<span>${msg("The requested event doesn't exist")}</span>`;

        return this.renderSummary(event.value);
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the event')}
          .error=${event.error.data.data}
        ></display-error>`;
    }
  }

  render() {
    return html`<sl-card
      style=" flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent('event-proposal-selected', {
            bubbles: true,
            composed: true,
            detail: {
              eventProposalHash: this.eventProposalHash,
            },
          })
        )}
    >
      ${this.renderEvent(this._eventProposal.value)}
    </sl-card>`;
  }

  static styles = [
    sharedStyles,
    css`
      .avatar-group agent-avatar:not(:first-of-type) {
        margin-left: -1rem;
      }
      :host {
        display: flex;
      }
    `,
  ];
}
