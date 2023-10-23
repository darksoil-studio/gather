import { hashProperty, wrapPathInSvg } from '@holochain-open-dev/elements';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import {
  joinAsync,
  pipe,
  sliceAndJoin,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import {
  mdiAccountGroup,
  mdiAccountPlus,
  mdiCalendar,
  mdiCalendarClock,
  mdiCancel,
  mdiCash,
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
import { CreateCancellationDialog } from '@holochain-open-dev/cancellations/dist/elements/create-cancellation-dialog.js';
import { SlDrawer } from '@shoelace-style/shoelace';

import './participants-for-event.js';
import './event-activity.js';
import './edit-proposal.js';
import './event-detail.js';
import './call-to-action-unsatisfied-needs-summary.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { ProposalWithStatus } from '../types.js';
import { ParticipateDialog } from './participate-dialog.js';
import { styles } from '../../../styles.js';

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

    if (proposalStatus === 'fulfilled_proposal')
      return html`<div class="column" style="gap: 8px; align-items: end">
        <sl-tag variant="success">${msg('Proposal Succeeded')}</sl-tag>
      </div>`;

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

    const myPubKeyStr = this.gatherStore.client.client.myPubKey.toString();
    const iAmParticipant = participants.find(i => i.toString() === myPubKeyStr);
    const iAmHost =
      proposal.currentProposal.action.author.toString() === myPubKeyStr ||
      !!proposal.currentProposal.entry.hosts.find(
        h => h.toString() === myPubKeyStr
      );

    const buttons = !this._isMobile
      ? [
          html`
            <sl-button
              variant="default"
              pill
              @click=${() => {
                (
                  this.shadowRoot?.querySelector('sl-drawer') as SlDrawer
                ).show();
              }}
            >
              <sl-icon .src=${wrapPathInSvg(mdiTimeline)}></sl-icon>
              ${msg('See Activity')}
            </sl-button>
          `,
        ]
      : [];

    if (
      proposalStatus === 'open_proposal' ||
      proposalStatus === 'fulfilled_proposal'
    ) {
      if (iAmHost) {
        buttons.push(html`
          <sl-button
            variant="default"
            pill
            @click=${() => {
              this._editing = true;
            }}
          >
            <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiPencil)}></sl-icon>
            ${msg('Edit Proposal')}
          </sl-button>
        `);
      }
      if (iAmParticipant) {
        buttons.push(html`
          <sl-button
            variant="warning"
            pill
            @click=${() =>
              (
                this.shadowRoot?.querySelector(
                  'create-cancellation-dialog'
                ) as CreateCancellationDialog
              ).show()}
          >
            <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiCancel)}></sl-icon>
            ${msg('Cancel Participation')}
          </sl-button>
        `);
      } else {
        const isMaximumPeopleReached =
          !!proposal.callToAction.entry.needs[0].max_possible &&
          participants.length >=
            proposal.callToAction.entry.needs[0].max_possible;
        const participateButton = html`
          <sl-button
            variant="primary"
            pill
            .disabled=${isMaximumPeopleReached}
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
        `;

        const participateButtonWithTooltip = isMaximumPeopleReached
          ? html`<sl-tooltip .content=${msg('Max. participants reached')}
              >${participateButton}</sl-tooltip
            >`
          : participateButton;

        buttons.push(html`
          <interested-button
            .proposalHash=${this.proposalHash}
          ></interested-button>
          ${participateButtonWithTooltip}
        `);
      }
    }

    return html`<div
      class="column"
      style="position:absolute; right: 16px; bottom: 16px; gap: 8px"
    >
      ${buttons.map(b => b)}
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

        <div class="column" style="flex: 1; gap: 16px">
          <div class="row" style="align-items: center">
            <span class="title" style="flex: 1"
              >${proposal.currentProposal.entry.title}</span
            >
            ${this.renderStatus(proposal)}
          </div>

          <span style="white-space: pre-line;"
            >${proposal.currentProposal.entry.description}</span
          >

          <div class="row" style="align-items: center; gap: 4px">
            <sl-icon
              style="font-size: 24px"
              title=${msg('location')}
              .src=${wrapPathInSvg(mdiMapMarker)}
            ></sl-icon>
            <span style="white-space: pre-line"
              >${proposal.currentProposal.entry.location
                ? proposal.currentProposal.entry.location
                : msg('To Be Defined')}</span
            >
          </div>
          <div class="row" style="align-items: center; gap: 4px">
            <sl-icon
              style="font-size: 24px"
              title=${msg('time')}
              .src=${wrapPathInSvg(mdiCalendarClock)}
            ></sl-icon>
            ${proposal.currentProposal.entry.time
              ? html`
                  <span
                    >${new Date(
                      proposal.currentProposal.entry.time!.start_time / 1000
                    ).toLocaleString()}
                    -
                    ${new Date(
                      (proposal.currentProposal.entry.time as any).end_time /
                        1000
                    ).toLocaleString()}</span
                  >
                `
              : html`<span>${msg('To Be Defined')}</span>`}
          </div>
          ${proposal.currentProposal.entry.cost
            ? html` <div
                style="display: flex; flex-direction: row; align-items: center; gap: 4px"
              >
                <sl-icon
                  style="font-size: 24px"
                  title=${msg('cost')}
                  .src=${wrapPathInSvg(mdiCash)}
                ></sl-icon>
                <span style="white-space: pre-line"
                  >${proposal.currentProposal.entry.cost}</span
                >
              </div>`
            : html``}

          <span class="placeholder"
            >${msg(
              'Edit the proposal and decide on a time and location to create the event.'
            )}</span
          >
        </div>
      </sl-card>
    `;
  }

  renderProposal(proposal: ProposalWithStatus, participants: AgentPubKey[]) {
    if (this._editing) {
      return html`<edit-proposal
        .originalProposalHash=${this.proposalHash}
        .proposal=${proposal}
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

          <sl-tab-panel name="proposal" style="position: relative; ">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div class="column" style="padding: 16px; gap: 16px">
                    ${this.renderDetail(proposal)}
                    <span class="title">${msg('Unsatisfied Needs')}</span>
                    <call-to-action-unsatisfied-needs-summary
                      .callToActionHash=${proposal.currentProposal.entry
                        .call_to_action_hash}
                    ></call-to-action-unsatisfied-needs-summary>
                  </div>
                </div>
              </div>
            </div>
            ${this.renderActions(proposal, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="participants" style="position: relative">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div class="column" style="padding: 16px; gap: 16px">
                    <participants-for-event
                      .proposalHash=${this.proposalHash}
                    ></participants-for-event>
                  </div>
                </div>
              </div>
            </div>
            ${this.renderActions(proposal, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="needs" style="position: relative">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div class="column" style="padding: 16px; gap: 16px">
                    <call-to-action-needs
                      .callToActionHash=${proposal.currentProposal.entry
                        .call_to_action_hash}
                    ></call-to-action-needs>
                  </div>
                </div>
              </div>
            </div>
            ${this.renderActions(proposal, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="activity">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div class="column" style="padding: 16px; gap: 16px">
                    <event-activity
                      .proposalHash=${this.proposalHash}
                    ></event-activity>
                  </div>
                </div>
              </div>
            </div>
          </sl-tab-panel>
        </sl-tab-group>
      `;

    return html`
      <div class="column" style="gap: 16px; align-items: center">
        ${this.renderDetail(proposal)}

        <div class="row" style="gap: 16px">
          <div class="column" style="gap: 16px">
            <span class="title">${msg('Participants')}</span>
            <participants-for-event
              .proposalHash=${this.proposalHash}
              style="width: 400px"
            ></participants-for-event>
          </div>
          <call-to-action-needs
            .callToActionHash=${proposal.currentProposal.entry
              .call_to_action_hash}
          ></call-to-action-needs>
        </div>
      </div>
      <sl-drawer .label=${msg('Activity')}>
        <event-activity
          style="flex: 1"
          .proposalHash=${proposal.originalActionHash}
        ></event-activity>
      </sl-drawer>
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
        if (proposal.status.type === 'actual_event') {
          return html`<event-detail
            style="flex: 1"
            .eventHash=${proposal.status.eventHash}
          ></event-detail>`;
        }

        const myParticipationCommitment = participants.get(
          this.gatherStore.client.client.myPubKey
        );

        return html` ${myParticipationCommitment
            ? html`
                <create-cancellation-dialog
                  .label=${msg('Cancel My Participation')}
                  .warning=${msg(
                    'Are you sure? All participants will be notified.'
                  )}
                  .cancelledHash=${myParticipationCommitment}
                ></create-cancellation-dialog>
              `
            : html``}
          <participate-dialog
            .proposalHash=${this.proposalHash}
          ></participate-dialog>
          ${this.renderProposal(proposal, Array.from(participants.keys()))}`;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the proposal')}
          .error=${this._proposal.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    styles,
    css`
      :host {
        display: flex;
        flex-direction: column;
      }
      sl-tab {
        background-color: white;
      }
      sl-tab sl-icon {
        font-size: 24px;
      }
      sl-tab-panel {
        --padding: 0;
      }
    `,
  ];
}
