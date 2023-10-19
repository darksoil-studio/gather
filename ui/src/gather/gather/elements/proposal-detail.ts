import {
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import { joinAsync, StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import {
  mdiAccountGroup,
  mdiAccountPlus,
  mdiBell,
  mdiCalendar,
  mdiCalendarClock,
  mdiCash,
  mdiCheck,
  mdiFormatListChecks,
  mdiMapMarker,
  mdiPencil,
  mdiTimeline,
} from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/relative-time/relative-time.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';

import '@darksoil/assemble/dist/elements/call-to-action-unsatisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-satisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-need-progress.js';

import './participants-for-event.js';
import './event-activity.js';
import './edit-proposal.js';
import './event-detail.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { ProposalWithStatus } from '../types.js';
import { ParticipateDialog } from './participate-dialog.js';

@localized()
@customElement('proposal-detail')
export class ProposalDetail extends LitElement {
  @property(hashProperty('proposal-hash'))
  proposalHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  _proposal = new StoreSubscriber(
    this,
    () =>
      joinAsync([
        this.gatherStore.proposalsStatus.get(this.proposalHash),
        this.gatherStore.participantsForProposal.get(this.proposalHash),
      ]),
    () => [this.proposalHash]
  );

  /**
   * @internal
   */
  @state()
  _editing = false;

  /**
   * @internal
   */
  @state()
  _approving = false;

  /**
   * @internal
   */
  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  renderStatus(proposal: ProposalWithStatus) {
    const proposalStatus = proposal.status.type;
    if (proposalStatus === 'cancelled_proposal')
      return html`<sl-tag variant="warning">${msg('Cancelled')}</sl-tag>`;
    if (proposalStatus === 'expired_proposal')
      return html`<sl-tag variant="warning">${msg('Expired')}</sl-tag>`;

    return html`<sl-tag
      >${msg('Open Proposal')}${proposal.callToAction.entry.expiration_time
        ? html`${msg(': expires')}&nbsp;
            <sl-relative-time
              .date=${proposal.callToAction.entry.expiration_time / 1000}
            ></sl-relative-time>`
        : html``}</sl-tag
    >`;
  }

  renderActions(proposal: ProposalWithStatus, participants: AgentPubKey[]) {
    const proposalStatus = proposal.status.type;
    if (proposalStatus !== 'open_proposal') return html``;

    const myPubKeyStr = this.gatherStore.client.client.myPubKey.toString();
    const iAmParticipant = participants.find(i => i.toString() === myPubKeyStr);
    const iAmHost =
      proposal.currentProposal.action.author.toString() === myPubKeyStr ||
      !!proposal.currentProposal.entry.hosts.find(
        h => h.toString() === myPubKeyStr
      );

    return html`<div
      class="column"
      style="position:absolute; right: 16px; bottom: 16px; gap: 8px"
    >
      ${iAmHost
        ? html`
            <sl-button
              variant="default"
              pill
              @click=${() => {
                this._editing = true;
              }}
            >
              <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiPencil)}></sl-icon>
              ${msg('Edit proposal')}
            </sl-button>
          `
        : iAmParticipant
        ? html``
        : html`
            <interest-button
              .proposalHash=${this.proposalHash}
            ></interest-button>
            <sl-button
              variant="primary"
              pill
              @click=${() =>
                (
                  this.shadowRoot?.querySelector(
                    'participate-dialog'
                  ) as ParticipateDialog
                ).show()}
            >
              <sl-icon
                slot="prefix"
                .src=${wrapPathInSvg(mdiAccountPlus)}
              ></sl-icon>
              ${msg('Participate')}
            </sl-button>
          `}
    </div> `;
  }

  renderDetail(proposal: ProposalWithStatus) {
    return html`
      <sl-card class="column">
        <show-image
          slot="image"
          .imageHash=${proposal.currentProposal.entry.image}
          style="height: 300px; flex: 1"
        ></show-image>

        <div class="row" style="flex: 1">
          <div style="display: flex; flex-direction: column; flex: 1;">
            <span class="title" style="margin-bottom: 16px"
              >${proposal.currentProposal.entry.title}</span
            >

            <span style="white-space: pre-line; margin-bottom: 16px"
              >${proposal.currentProposal.entry.description}</span
            >

            <div class="column" style="justify-content: end; flex: 1">
              <div
                style="display: flex; flex-direction: row; align-items: center;"
              >
                <sl-icon
                  title=${msg('location')}
                  style="margin-right: 4px"
                  .src=${wrapPathInSvg(mdiMapMarker)}
                ></sl-icon>
                <span style="white-space: pre-line"
                  >${proposal.currentProposal.entry.location}</span
                >
              </div>

              <div
                style="display: flex; flex-direction: row; align-items: center; margin-top: 16px"
              >
                <sl-icon
                  title=${msg('time')}
                  style="margin-right: 4px"
                  .src=${wrapPathInSvg(mdiCalendarClock)}
                ></sl-icon>
                <span
                  >${new Date(
                    proposal.currentProposal.entry.time!.start_time / 1000
                  ).toLocaleString()}
                  -
                  ${new Date(
                    (proposal.currentProposal.entry.time as any).end_time / 1000
                  ).toLocaleString()}</span
                >
              </div>

              ${proposal.currentProposal.entry.cost
                ? html` <div
                    style="display: flex; flex-direction: row; align-items: center; margin-top: 16px"
                  >
                    <sl-icon
                      title=${msg('cost')}
                      style="margin-right: 4px"
                      .src=${wrapPathInSvg(mdiCash)}
                    ></sl-icon>
                    <span style="white-space: pre-line"
                      >${proposal.currentProposal.entry.cost}</span
                    >
                  </div>`
                : html``}
            </div>
          </div>

          <div class="column" style="align-items: end">
            ${this.renderStatus(proposal)}
            <div
              class="row"
              style="justify-content:end; flex: 1; margin-top: 8px"
            ></div>
          </div>
        </div>
      </sl-card>
    `;
  }

  renderProposal(proposal: ProposalWithStatus, participants: AgentPubKey[]) {
    if (this._editing) {
      return html`<edit-proposal
        .originalProposalHash=${this.proposalHash}
        .currentRecord=${proposal}
        @proposal-updated=${async () => {
          this._editing = false;
        }}
        @edit-canceled=${() => {
          this._editing = false;
        }}
        style="display: flex;"
      ></edit-proposal>`;
    }

    if (this._isMobile)
      return html`
        <sl-tab-group placement="bottom" style="flex: 1; width: 100%;">
          <sl-tab slot="nav" panel="proposal">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiCalendar)}></sl-icon>
              <span>${msg('Proposal')}</span>
            </div>
          </sl-tab>
          <sl-tab slot="nav" panel="participants">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiAccountGroup)}></sl-icon>
              <span>${msg('Participants')}</span>
            </div>
          </sl-tab>
          <sl-tab slot="nav" panel="needs">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiFormatListChecks)}></sl-icon>
              <span>${msg('Needs')}</span>
            </div>
          </sl-tab>
          <sl-tab slot="nav" panel="activity">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiTimeline)}></sl-icon>
              <span>${msg('Activity')}</span>
            </div>
          </sl-tab>

          <sl-tab-panel name="proposal" style="position: relative">
            ${this.renderDetail(proposal)}
            ${this.renderActions(proposal, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="participants" style="position: relative">
            <participants-for-event
              style="margin-bottom: 16px;"
              .proposalHash=${this.proposalHash}
            ></participants-for-event>
            ${this.renderActions(proposal, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="needs" style="position: relative">
            <call-to-action-needs
              .callToActionHash=${proposal.currentProposal.entry
                .call_to_action_hash}
            ></call-to-action-needs>
            ${this.renderActions(proposal, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="activity">
            <event-activity .proposalHash=${this.proposalHash}></event-activity>
          </sl-tab-panel>
        </sl-tab-group>
      `;

    return html`
      <div class="column" style="gap: 16px; align-items: center">
        ${this.renderDetail(proposal)}

        <div class="row" style="gap: 16px">
          <participants-for-event
            style="margin-bottom: 16px;"
            .eventHash=${this.proposalHash}
          ></participants-for-event>
          <call-to-action-needs
            .callToActionHash=${proposal.currentProposal.entry
              .call_to_action_hash}
          ></call-to-action-needs>
        </div>
      </div>
      ${this.renderActions(proposal, participants)}
    `;
  }

  render() {
    switch (this._proposal.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        const proposal = this._proposal.value.value[0];
        const participants = this._proposal.value.value[1];
        if (proposal.status.type === 'fulfilled_proposal') {
          return html`<event-detail
            style="flex: 1"
            .eventHash=${proposal.status.eventHash}
          ></event-detail>`;
        }

        return html` <participate-dialog
            .proposalHash=${this.proposalHash}
          ></participate-dialog>
          ${this.renderProposal(proposal, participants)}`;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the proposal')}
          .error=${this._proposal.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      sl-tab-group::part(body) {
        display: flex;
        flex: 1;
      }
      sl-tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: white;
      }
      sl-tab-group {
        display: flex;
      }
      sl-tab-group::part(base) {
        display: flex;
        flex: 1;
      }
      sl-tab-panel {
        width: 100%;
        --padding: 0;
      }
      sl-tab-panel {
        --padding: 0;
        padding: 16px;
      }
      sl-tab sl-icon {
        font-size: 24px;
      }
    `,
  ];
}
