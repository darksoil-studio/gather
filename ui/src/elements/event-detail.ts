import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import {
  joinAsync,
  StoreSubscriber,
  toPromise,
} from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
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

import '@darksoil/assemble/dist/elements/call-to-action-unsatisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-satisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-need-progress.js';

import './participants-for-event.js';
import './edit-event.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event, EventStatus, EventWithStatus } from '../types.js';
import {
  mdiAccountPlus,
  mdiCalendarClock,
  mdiCancel,
  mdiCash,
  mdiCheckDecagram,
  mdiDelete,
  mdiMapMarker,
  mdiPencil,
} from '@mdi/js';
import { SlDialog } from '@shoelace-style/shoelace';
import { CallToAction } from '@darksoil/assemble';
import { isExpired } from '../utils.js';

@localized()
@customElement('event-detail')
export class EventDetail extends LitElement {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  _event = new StoreSubscriber(
    this,
    () =>
      joinAsync([
        this.gatherStore.events.get(this.eventHash),
        this.gatherStore.participantsForEvent.get(this.eventHash),
      ]),
    () => [this.eventHash]
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
  _cancelling = false;

  /**
   * @internal
   */
  @state()
  _approving = false;

  /**
   * @internal
   */
  @state()
  _activePanel: 'unsatisfied_needs' | 'satisfied_needs' = 'unsatisfied_needs';

  /**
   * @internal
   */
  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  @state()
  committing = false;

  async commitToParticipate(event: EventWithStatus) {
    if (this.committing) return;

    this.committing = true;

    try {
      await this.gatherStore.commitToParticipate(event.currentEvent);

      this.dispatchEvent(
        new CustomEvent('participant-added', {
          bubbles: true,
          composed: true,
          detail: {
            eventHash: this.eventHash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error adding participant.'));
      console.error(e);
    }
    this.committing = false;
  }

  async cancelEvent() {
    if (this._cancelling) return;

    this._cancelling = true;
    try {
      await this.gatherStore.client.cancelEvent(this.eventHash);

      this.dispatchEvent(
        new CustomEvent('event-deleted', {
          bubbles: true,
          composed: true,
          detail: {
            eventHash: this.eventHash,
          },
        })
      );

      (
        this.shadowRoot?.getElementById('cancel-event-dialog') as SlDialog
      ).hide();
    } catch (e: any) {
      notifyError(msg('Error deleting the event'));
      console.error(e);
    }
    this._cancelling = false;
  }

  async approveProposal(event: EventWithStatus) {
    if (this._approving) return;

    this._approving = true;
    try {
      await this.gatherStore.assembleStore.client.createAssembly({
        call_to_action_hash: event.currentEvent.entry.call_to_action_hash,
        satisfactions_hashes: [],
      });

      (
        this.shadowRoot?.getElementById('approve-proposal-dialog') as SlDialog
      ).hide();
    } catch (e: any) {
      notifyError(msg('Error approving the proposal'));
      console.error(e);
    }
    this._cancelling = false;
  }

  renderApproveProposalDialog(event: EventWithStatus) {
    return html`
      <sl-dialog id="approve-proposal-dialog" .label=${msg('Approve Proposal')}>
        <span
          >${msg(
            'Are you sure you want to approve this proposal and convert it to an event?'
          )}</span
        >

        <sl-button
          slot="footer"
          variant="primary"
          .loading=${this._approving}
          @click=${() => this.approveProposal(event)}
          >${msg('Approve Proposal')}</sl-button
        >
      </sl-dialog>
    `;
  }

  renderCancelEventDialog() {
    return html`
      <sl-dialog id="cancel-event-dialog" .label=${msg('Cancel Event')}>
        <span>${msg('Are you sure you want to cancel this event?')}</span>

        <sl-button
          slot="footer"
          variant="danger"
          .loading=${this._cancelling}
          @click=${() => this.cancelEvent()}
          >${msg('Cancel Event')}</sl-button
        >
      </sl-dialog>
    `;
  }

  renderStatus(event: EventWithStatus) {
    const eventStatus = event.status;
    if (
      eventStatus === 'cancelled_event' ||
      eventStatus === 'cancelled_event_proposal'
    )
      return html`<sl-tag variant="warning">${msg('Cancelled')}</sl-tag>`;
    if (eventStatus === 'expired_event_proposal')
      return html`<sl-tag variant="warning">${msg('Expired')}</sl-tag>`;
    if (eventStatus === 'upcoming_event')
      return html`<sl-tag variant="success">${msg('Upcoming Event')}</sl-tag>`;
    if (eventStatus === 'past_event')
      return html`<sl-tag variant="success">${msg('Past Event')}</sl-tag>`;

    return html`<sl-tag
      >${msg('Open Proposal')}${event.callToAction.entry.expiration_time
        ? html`${msg(': expires')}&nbsp;
            <sl-relative-time
              .date=${event.callToAction.entry.expiration_time / 1000}
            ></sl-relative-time>`
        : html``}</sl-tag
    >`;
  }

  renderActions(event: EventWithStatus, participants: AgentPubKey[]) {
    const amIAuthor =
      event.currentEvent.action.author.toString() ===
      this.gatherStore.client.client.myPubKey.toString();
    const eventStatus = event.status;
    // if (
    //   !(
    //     amIAuthor &&
    //     eventStatus !== 'upcoming_event' &&
    //     eventStatus !== 'open_event_proposal'
    //   )
    // )
    //   return html``;
    if (
      eventStatus !== 'open_event_proposal' &&
      eventStatus !== 'upcoming_event'
    )
      return html``;

    return html`<div
      class="column"
      style="position:absolute; right: 16px; bottom: 16px; gap: 8px"
    >
      <sl-button
        variant="default"
        pill
        @click=${() => {
          this._editing = true;
        }}
      >
        <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiPencil)}></sl-icon>
        ${msg('Edit event')}
      </sl-button>
      <sl-button
        variant="warning"
        pill
        @click=${() => {
          (
            this.shadowRoot?.getElementById('cancel-event-dialog') as SlDialog
          ).show();
        }}
      >
        <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiCancel)}></sl-icon>
        ${msg('Cancel Event')}
      </sl-button>
      ${participants
        .map(a => a.toString())
        .includes(this.gatherStore.client.client.myPubKey.toString())
        ? html``
        : html`
            <sl-button
              variant="primary"
              pill
              .loading=${this.committing}
              @click=${() => this.commitToParticipate(event)}
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

  renderDetail(event: EventWithStatus) {
    return html`
      ${this.renderApproveProposalDialog(event)}
      ${this.renderCancelEventDialog()}
      <sl-card class="column">
        <show-image
          slot="image"
          .imageHash=${event.currentEvent.entry.image}
          style="height: 300px; flex: 1"
        ></show-image>

        <div class="row" style="flex: 1">
          <div style="display: flex; flex-direction: column; flex: 1;">
            <span class="title" style="margin-bottom: 16px"
              >${event.currentEvent.entry.title}</span
            >

            <span style="white-space: pre-line; margin-bottom: 16px"
              >${event.currentEvent.entry.description}</span
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
                  >${event.currentEvent.entry.location}</span
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
                    event.currentEvent.entry.start_time / 1000
                  ).toLocaleString()}
                  -
                  ${new Date(
                    event.currentEvent.entry.end_time / 1000
                  ).toLocaleString()}</span
                >
              </div>

              ${event.currentEvent.entry.cost
                ? html` <div
                    style="display: flex; flex-direction: row; align-items: center; margin-top: 16px"
                  >
                    <sl-icon
                      title=${msg('cost')}
                      style="margin-right: 4px"
                      .src=${wrapPathInSvg(mdiCash)}
                    ></sl-icon>
                    <span style="white-space: pre-line"
                      >${event.currentEvent.entry.cost}</span
                    >
                  </div>`
                : html``}
            </div>
          </div>

          <div class="column" style="align-items: end">
            ${this.renderStatus(event)}
            <div
              class="row"
              style="justify-content:end; flex: 1; margin-top: 8px"
            ></div>
          </div>
        </div>
      </sl-card>
    `;
  }

  renderEvent(event: EventWithStatus, participants: AgentPubKey[]) {
    if (this._editing) {
      return html`<edit-event
        .originalEventHash=${this.eventHash}
        .currentRecord=${event}
        @event-updated=${async () => {
          this._editing = false;
        }}
        @edit-canceled=${() => {
          this._editing = false;
        }}
        style="display: flex;"
      ></edit-event>`;
    }

    if (this._isMobile)
      return html`
        <sl-tab-group placement="bottom" style="flex: 1; width: 100%;">
          <sl-tab slot="nav" panel="event">${msg('Event')}</sl-tab>
          <sl-tab slot="nav" panel="participants"
            >${msg('Participants')}</sl-tab
          >
          <sl-tab slot="nav" panel="needs">${msg('Needs')} </sl-tab>
          <sl-tab-panel name="event" style="position: relative">
            ${this.renderDetail(event)}
            ${this.renderActions(event, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="participants" style="position: relative">
            <participants-for-event
              style="margin-bottom: 16px;"
              .eventHash=${this.eventHash}
            ></participants-for-event>
            ${this.renderActions(event, participants)}
          </sl-tab-panel>
          <sl-tab-panel name="needs" style="position: relative">
            <div class="column" style="gap: 16px;">
              <div class="column" style="align-items: center;">
                <sl-radio-group
                  value="unsatisfied_needs"
                  @sl-change=${(e: any) => {
                    this._activePanel = e.target.value;
                  }}
                >
                  <sl-radio-button value="unsatisfied_needs"
                    >${msg('Unsatisfied Needs')}</sl-radio-button
                  >
                  <sl-radio-button value="satisfied_needs"
                    >${msg('Satisfied Needs')}</sl-radio-button
                  >
                </sl-radio-group>
              </div>
              ${this._activePanel === 'unsatisfied_needs'
                ? html`
                    <call-to-action-unsatisfied-needs
                      .callToActionHash=${event.currentEvent.entry
                        .call_to_action_hash}
                      .hideNeeds=${[0]}
                    ></call-to-action-unsatisfied-needs>
                  `
                : html`
                    <call-to-action-satisfied-needs
                      .callToActionHash=${event.currentEvent.entry
                        .call_to_action_hash}
                      .hideNeeds=${[0]}
                    ></call-to-action-satisfied-needs>
                  `}
            </div>
            ${this.renderActions(event, participants)}
          </sl-tab-panel>
        </sl-tab-group>
      `;

    return html`<div class="row" style="justify-content: center">
        <div class="column" style="margin-right: 16px;">
          ${this.renderDetail(event)}

          <div class="row" style="gap: 16px">
            <div class="column" style="gap: 16px">
              <span class="title">${msg('Unsatisfied needs')}</span>
              <call-to-action-unsatisfied-needs
                .callToActionHash=${event.currentEvent.entry
                  .call_to_action_hash}
                .hideNeeds=${[0]}
              ></call-to-action-unsatisfied-needs>
            </div>
            <div class="column" style="gap: 16px">
              <span class="title">${msg('Satisfied needs')}</span>
              <call-to-action-needs
                .callToActionHash=${event.currentEvent.entry
                  .call_to_action_hash}
                .hideNeeds=${[0]}
              ></call-to-action-needs>
            </div>
          </div>
        </div>
        <div class="column">
          <participants-for-event
            style="margin-bottom: 16px;"
            .eventHash=${this.eventHash}
          ></participants-for-event>
          <slot name="attachments"></slot>
        </div>
      </div>
      ${this.renderActions(event, participants)} `;
  }

  render() {
    switch (this._event.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        const event = this._event.value.value;

        return this.renderEvent(event[0], event[1]);
      case 'error':
        return html`<display-error
          .error=${this._event.value.error}
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
    `,
  ];
}
