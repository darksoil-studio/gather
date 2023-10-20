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
import '@shoelace-style/shoelace/dist/components/card/card.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';

import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';

import '@darksoil/assemble/dist/elements/call-to-action-progress.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { ProposalWithStatus } from '../types.js';
import './call-to-action-needs.js';
import './agents-avatars.js';

@localized()
@customElement('proposal-summary')
export class ProposalSummary extends LitElement {
  @property(hashProperty('event-hash'))
  proposalHash!: ActionHash;

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
  _proposal = new StoreSubscriber(
    this,
    () => this.gatherStore.proposalsStatus.get(this.proposalHash),
    () => [this.proposalHash]
  );

  /**
   * @internal
   */
  _participants = new StoreSubscriber(
    this,
    () => this.gatherStore.participantsForProposal.get(this.proposalHash),
    () => [this.proposalHash]
  );

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  renderParticipants() {
    if (this._participants.value.status !== 'complete') return html``;
    const participants = Array.from(this._participants.value.value.keys());

    if (participants.length === 0)
      return html`<span>${msg('No participants yet')}</span>`;

    return html`<agents-avatars .agents=${participants}></agents-avatars> `;
  }

  renderSummary(proposal: ProposalWithStatus) {
    return html`
      ${this._isMobile
        ? html`
            <show-image
              slot="image"
              style="flex: 1; height: 200px"
              .imageHash=${proposal.currentProposal.entry.image}
            ></show-image>
          `
        : html``}

      <div style="display: flex; flex-direction: row; flex: 1">
        <div style="display: flex; flex-direction: column; flex: 1; gap: 16px">
          <div
            style="display: flex; flex-direction: row; flex: 1; align-items: center"
          >
            <span class="title" style="flex: 1"
              >${proposal.currentProposal.entry.title}</span
            >
          </div>

          <span style="flex: 1"></span>

          <div style="display: flex; flex-direction: row; ">
            <div class="column" style="justify-content: end; gap: 8px">
              ${this._isMobile
                ? html``
                : html`
                    <div
                      style="display: flex; flex-direction: row; align-items: center; gap: 4px"
                    >
                      <sl-icon
                        title=${msg('location')}
                        .src=${wrapPathInSvg(mdiMapMarker)}
                      ></sl-icon>
                      <span style="white-space: pre-line"
                        >${proposal.currentProposal.entry.location
                          ? proposal.currentProposal.entry.location
                          : msg('TBD')}</span
                      >
                    </div>
                  `}
              <div
                style="display: flex; flex-direction: row; align-items: center; gap: 4px"
              >
                <sl-icon .src=${wrapPathInSvg(mdiCalendarClock)}></sl-icon>
                <span style="white-space: pre-line"
                  >${proposal.currentProposal.entry.time
                    ? new Date(
                        proposal.currentProposal.entry.time.start_time / 1000
                      ).toLocaleString()
                    : msg('TBD')}</span
                >
              </div>
            </div>

            <span style="flex: 1"></span>

            <div class="column" style="justify-content: end">
              ${this.renderParticipants()}
            </div>
          </div>

          ${proposal.status.type === 'open_proposal'
            ? html` <call-to-action-progress
                .callToActionHash=${proposal.currentProposal.entry
                  .call_to_action_hash}
              ></call-to-action-progress>`
            : html``}
        </div>

        ${!this._isMobile
          ? html` <show-image
              style="width: 200px; height: 200px; margin-top: -20px; margin-bottom: -20px; margin-right: -20px; margin-left: 16px"
              .imageHash=${proposal.currentProposal.entry.image}
            ></show-image>`
          : html``}
      </div>
    `;
  }

  renderProposal(proposal: AsyncStatus<ProposalWithStatus>) {
    switch (proposal.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return this.renderSummary(proposal.value);
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the proposal')}
          .error=${proposal.error}
        ></display-error>`;
    }
  }

  render() {
    return html`<sl-card
      style=" flex: 1; cursor: grab;"
      @click=${() =>
        this.dispatchEvent(
          new CustomEvent('proposal-selected', {
            bubbles: true,
            composed: true,
            detail: {
              proposalHash: this.proposalHash,
            },
          })
        )}
    >
      ${this.renderProposal(this._proposal.value)}
    </sl-card>`;
  }

  static styles = [
    sharedStyles,
    css`
      sl-icon {
        font-size: 24px;
      }

      :host {
        display: flex;
      }
    `,
  ];
}
