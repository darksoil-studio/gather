import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
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

import '@darksoil/assemble/dist/elements/call-to-action-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-need-progress.js';

import './participants-for-event.js';
import './edit-event.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';
import {
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
    () => this.gatherStore.eventsCallToActionsAndAssemblies.get(this.eventHash),
    () => [this.eventHash]
  );

  /**
   * @internal
   */
  _participants = new StoreSubscriber(
    this,
    () => this.gatherStore.participantsForEvent.get(this.eventHash),
    () => []
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

  async deleteEvent(event: EntryRecord<Event>) {
    if (this._cancelling) return;

    this._cancelling = true;
    try {
      await this.gatherStore.client.deleteEvent(this.eventHash);

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

  async approveProposal(event: EntryRecord<Event>) {
    if (this._approving) return;

    this._approving = true;
    try {
      await this.gatherStore.assembleStore.client.createAssembly({
        call_to_action_hash: event.entry.call_to_action_hash,
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

  renderApproveProposalDialog(entryRecord: EntryRecord<Event>) {
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
          @click=${() => this.approveProposal(entryRecord)}
          >${msg('Approve Proposal')}</sl-button
        >
      </sl-dialog>
    `;
  }

  renderCancelEventDialog(entryRecord: EntryRecord<Event>) {
    return html`
      <sl-dialog id="cancel-event-dialog" .label=${msg('Cancel Event')}>
        <span>${msg('Are you sure you want to cancel this event?')}</span>

        <sl-button
          slot="footer"
          variant="danger"
          .loading=${this._cancelling}
          @click=${() => this.deleteEvent(entryRecord)}
          >${msg('Cancel Event')}</sl-button
        >
      </sl-dialog>
    `;
  }

  renderStatus(
    isCancelled: boolean,
    callToAction: EntryRecord<CallToAction>,
    assemblies: ActionHash[]
  ) {
    if (isCancelled)
      return html`<sl-tag variant="warning">${msg('Cancelled')}</sl-tag>`;
    if (isExpired(callToAction.entry) && assemblies.length === 0)
      return html`<sl-tag variant="warning">${msg('Expired')}</sl-tag>`;
    if (assemblies.length > 0)
      return html`<sl-tag variant="success">${msg('Event')}</sl-tag>`;

    return html`<sl-tag
      >${msg('Proposal')}${callToAction.entry.expiration_time
        ? html`${msg(': expires')}&nbsp;
            <sl-relative-time
              .date=${callToAction.entry.expiration_time / 1000}
            ></sl-relative-time>`
        : html``}</sl-tag
    >`;
  }

  renderActions(
    event: EntryRecord<Event>,
    isCancelled: boolean,
    callToAction: EntryRecord<CallToAction>,
    assemblies: ActionHash[]
  ) {
    const amIAuthor =
      event.action.author.toString() ===
      this.gatherStore.client.client.myPubKey.toString();
    if (
      isCancelled ||
      (isExpired(callToAction.entry) && assemblies.length === 0) ||
      !amIAuthor
    )
      return html``;

    return html`
      <sl-icon-button
        title=${msg('Edit event')}
        @click=${() => {
          this._editing = true;
        }}
        .src=${wrapPathInSvg(mdiPencil)}
      ></sl-icon-button>
      <sl-icon-button
        title=${msg('Cancel event')}
        style="margin-left: 8px"
        .src=${wrapPathInSvg(mdiCancel)}
        @click=${() =>
          (
            this.shadowRoot?.getElementById('cancel-event-dialog') as SlDialog
          ).show()}
      ></sl-icon-button>
      ${assemblies.length === 0
        ? html`
            <sl-icon-button
              title=${msg('Approve proposal')}
              style="margin-left: 8px"
              .src=${wrapPathInSvg(mdiCheckDecagram)}
              @click=${() =>
                (
                  this.shadowRoot?.getElementById(
                    'approve-proposal-dialog'
                  ) as SlDialog
                ).show()}
            ></sl-icon-button>
          `
        : html``}
    `;
  }

  renderDetail(
    event: EntryRecord<Event>,
    isCancelled: boolean,
    callToAction: EntryRecord<CallToAction>,
    assemblies: ActionHash[]
  ) {
    return html`
      ${this.renderApproveProposalDialog(event)}
      ${this.renderCancelEventDialog(event)}
      <sl-card class="column">
        <show-image
          slot="image"
          .imageHash=${event.entry.image}
          style="width: 700px; height: 300px; flex-basis: 0;"
        ></show-image>

        <div class="row" style="flex: 1">
          <div style="display: flex; flex-direction: column; flex: 1;">
            <span class="title" style="margin-bottom: 16px"
              >${event.entry.title}</span
            >

            <span style="white-space: pre-line; margin-bottom: 16px"
              >${event.entry.description}</span
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
                  >${event.entry.location}</span
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
                  >${new Date(event.entry.start_time / 1000).toLocaleString()} -
                  ${new Date(
                    event.entry.end_time / 1000
                  ).toLocaleString()}</span
                >
              </div>

              ${event.entry.cost
                ? html` <div
                    style="display: flex; flex-direction: row; align-items: center; margin-top: 16px"
                  >
                    <sl-icon
                      title=${msg('cost')}
                      style="margin-right: 4px"
                      .src=${wrapPathInSvg(mdiCash)}
                    ></sl-icon>
                    <span style="white-space: pre-line"
                      >${event.entry.cost}</span
                    >
                  </div>`
                : html``}
            </div>
          </div>

          <div class="column" style="align-items: end">
            ${this.renderStatus(isCancelled, callToAction, assemblies)}
            <div
              class="row"
              style="justify-content:end; flex: 1; margin-top: 8px"
            >
              ${this.renderActions(
                event,
                isCancelled,
                callToAction,
                assemblies
              )}
              <slot name="action"></slot>
            </div>
            <div class="row" style="align-items: center;">
              <span style="margin-right: 8px">${msg('Hosted by')}</span>
              <agent-avatar .agentPubKey=${event.action.author}></agent-avatar>
            </div>
          </div>
        </div>
      </sl-card>
    `;
  }

  renderEvent(
    event: EntryRecord<Event>,
    isCancelled: boolean,
    callToAction: EntryRecord<CallToAction>,
    assemblies: ActionHash[]
  ) {
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
        style="display: flex; flex: 1;"
      ></edit-event>`;
    }

    return html`<div class="row" style="justify-content: center">
      <div class="column" style="margin-right: 16px;">
        ${this.renderDetail(event, isCancelled, callToAction, assemblies)}

        <call-to-action-needs
          .callToActionHash=${event.entry.call_to_action_hash}
          .hideNeeds=${[0]}
        ></call-to-action-needs>
      </div>
      <div class="column">
        <participants-for-event
          style="margin-bottom: 16px;"
          .eventHash=${this.eventHash}
        ></participants-for-event>
        <slot name="attachments"></slot>
      </div>
    </div> `;
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
        const event = this._event.value.value[0];
        const maybeCallToAction = this._event.value.value[1];

        if (!event || !maybeCallToAction || !maybeCallToAction[0])
          return html`<span
            >${msg('The requested event was not found.')}</span
          >`;

        return this.renderEvent(
          event.record,
          event.isCancelled,
          maybeCallToAction[0],
          maybeCallToAction[1]
        );
      case 'error':
        return html`<display-error
          .error=${this._event.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
