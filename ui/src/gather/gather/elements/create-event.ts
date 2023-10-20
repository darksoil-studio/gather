import {
  notifyError,
  onSubmit,
  sharedStyles,
} from '@holochain-open-dev/elements';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { AgentPubKey } from '@holochain/client';

import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/radio/radio.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import '@holochain-open-dev/elements/dist/elements/sl-datetime-input.js';
import '@holochain-open-dev/profiles/dist/elements/search-agent.js';

import '@darksoil/assemble/dist/elements/call-to-action-need-form.js';
import '@darksoil/assemble/dist/elements/call-to-action-needs-form.js';

import { CallToAction, Need } from '@darksoil/assemble';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
import { SlSwitch } from '@shoelace-style/shoelace';
import { EntryRecord } from '@holochain-open-dev/utils';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event, Proposal } from '../types.js';

import './search-agents.js';

@localized()
@customElement('create-event')
export class CreateEvent extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state()
  committing = false;

  @state()
  isProposal = false;

  @state()
  timeTbd = false;

  @state()
  locationTbd = false;

  @state()
  hosts: Array<AgentPubKey> = [];

  @state()
  currentPage = 0;

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  async createEvent(fields: any) {
    if (this.committing) return;

    const needsFields = fields.need
      ? Array.isArray(fields.need)
        ? fields.need
        : [fields.need]
      : [];

    const hosts = fields.hosts
      ? Array.isArray(fields.hosts)
        ? fields.hosts
        : [fields.hosts]
      : [];

    const needs: Array<Need> = needsFields.map((n: string) => JSON.parse(n));
    const participantsNeeds: Need = JSON.parse(fields.participants);

    needs.unshift(participantsNeeds);

    this.committing = true;
    try {
      const callToAction: CallToAction = {
        admins: hosts,
        expiration_time: fields.expiration_time
          ? new Date(fields.expiration_time).valueOf() * 1000
          : undefined,
        needs,
        parent_call_to_action_hash: undefined,
      };

      const callToActionEntryRecord =
        await this.gatherStore.assembleStore.client.createCallToAction(
          callToAction
        );

      let eventRecord: EntryRecord<Event | Proposal>;
      if (this.isProposal) {
        const time = !this.timeTbd
          ? {
              type: 'Unique',
              start_time: new Date(fields.start_time).valueOf() * 1000,
              end_time: new Date(fields.end_time).valueOf() * 1000,
            }
          : undefined;
        const proposal: Proposal = {
          ...fields,
          hosts,
          time,
          call_to_action_hash: callToActionEntryRecord.actionHash,
        };
        eventRecord = await this.gatherStore.client.createProposal(proposal);
      } else {
        const event: Event = {
          ...fields,
          hosts,
          time: {
            type: 'Unique',
            start_time: new Date(fields.start_time).valueOf() * 1000,
            end_time: new Date(fields.end_time).valueOf() * 1000,
          },
          from_proposal: undefined,
          call_to_action_hash: callToActionEntryRecord.actionHash,
        };
        eventRecord = await this.gatherStore.client.createEvent(event);
      }

      if (this.isProposal) {
        this.dispatchEvent(
          new CustomEvent('proposal-created', {
            composed: true,
            bubbles: true,
            detail: {
              proposalHash: eventRecord.actionHash,
            },
          })
        );
      } else {
        this.dispatchEvent(
          new CustomEvent('event-created', {
            composed: true,
            bubbles: true,
            detail: {
              eventHash: eventRecord.actionHash,
            },
          })
        );
      }
    } catch (e: any) {
      notifyError(
        this.isProposal
          ? msg('Error creating the proposal')
          : msg('Error creating the event')
      );
      console.error(e);
    }
    this.committing = false;
  }

  renderBackButton() {
    return html`
      <sl-button
        @click=${() => {
          this.currentPage -= 1;
        }}
      >
        ${msg('Back')}
      </sl-button>
    `;
  }

  renderNextButton() {
    return html`
      <sl-button
        @click=${() => {
          const form = this.shadowRoot?.getElementById('form') as
            | HTMLFormElement
            | undefined;
          if (form) {
            if (this.currentPage === 2 && !form.reportValidity()) return;
          }
          this.currentPage += 1;
        }}
      >
        ${msg('Next')}
      </sl-button>
    `;
  }

  renderIsProposal(pageIndex: number) {
    return html`
      <div
        class="column"
        style=${styleMap({
          display: this.currentPage === pageIndex ? 'flex' : 'none',
          gap: '16px',
        })}
      >
        <span
          >${msg(
            'Do you just want to propose an event, or do you want to create an actual event?'
          )}</span
        >

        <span class="placeholder"
          >${msg(
            "Proposals will only become actual events if the minimum required needs for the events are fulfilled by other people's commitments, and when a specific time and place for the event has been decided."
          )}</span
        >

        <sl-radio-group
          @sl-change=${(e: any) => {
            this.isProposal = e.target.value !== 'event';
          }}
          value="event"
        >
          <sl-radio value="event" style="margin-bottom: 8px"
            >${msg('Create Event')}</sl-radio
          >
          <sl-radio value="proposal">${msg('Propose Event')}</sl-radio>
        </sl-radio-group>

        <div class="row" style="gap: 8px; justify-content: end">
          ${this.renderNextButton()}
        </div>
      </div>
    `;
  }

  renderHostsFields(pageIndex: number) {
    return html`
      <div
        class="column"
        style=${styleMap({
          display: this.currentPage === pageIndex ? 'flex' : 'none',
          gap: '16px',
        })}
      >
        <span class="title">${msg('Hosts')}</span>
        <span
          >${msg(
            'Who hosts this event? Hosts are able to update the event details (time, location, etc.), and accept needs that require host approval.'
          )}</span
        >
        <div class="column" style="align-items: center">
          <search-agents name="hosts" style="width: 300px;"></search-agents>
        </div>

        <div class="row" style="gap: 8px; justify-content: end">
          ${this.renderBackButton()} ${this.renderNextButton()}
        </div>
      </div>
    `;
  }

  renderEventFields(pageIndex: number) {
    return html`
      <div
        class="column"
        style=${styleMap({
          display: this.currentPage === pageIndex ? 'flex' : 'none',
          gap: '16px',
        })}
      >
        <span>${msg('Event Image')}*</span>
        <upload-files
          name="image"
          required
          style="display: flex"
          one-file
          accepted-files="image/jpeg,image/png,image/gif"
        ></upload-files>

        <sl-input name="title" required .label=${msg('Title')}></sl-input>
        <sl-textarea
          name="description"
          required
          .label=${msg('Description')}
        ></sl-textarea>

        <div class="row" style="gap: 8px; align-items: center;">
          <div class="column" style="gap: 8px; flex: 1">
            <sl-datetime-input
              name="start_time"
              .disabled=${this.timeTbd}
              .min=${new Date().toISOString().slice(0, 16)}
              .required=${!this.isProposal || !this.timeTbd}
              .label=${msg('Start Time')}
              style="flex: 1"
              id="start-time"
              @input=${() => this.requestUpdate()}
            ></sl-datetime-input>
            <sl-datetime-input
              name="end_time"
              .required=${!this.isProposal || !this.timeTbd}
              .disabled=${this.timeTbd}
              .label=${msg('End Time')}
              style="flex: 1"
              .min=${(this.shadowRoot?.getElementById('start-time') as SlInput)
                ?.value}
            ></sl-datetime-input>
          </div>
          ${this.isProposal
            ? html` <sl-switch
                style="margin-top: 16px"
                @sl-change=${() => {
                  this.timeTbd = !this.timeTbd;
                }}
                >${msg('TBD')}</sl-switch
              >`
            : html``}
        </div>

        <div class="row" style="gap: 8px; align-items: center;">
          <sl-input
            name="location"
            .required=${!this.isProposal || !this.locationTbd}
            .disabled=${this.locationTbd}
            .label=${msg('Location')}
            style="flex: 1"
          ></sl-input>
          ${this.isProposal
            ? html` <sl-switch
                style="margin-top: 16px"
                @sl-change=${() => {
                  this.locationTbd = !this.locationTbd;
                }}
                >${msg('TBD')}</sl-switch
              >`
            : html``}
        </div>
        <sl-input name="cost" .label=${msg('Cost')} style="flex: 1"></sl-input>

        <div class="row" style="justify-content: end; gap: 16px">
          ${this.renderBackButton()} ${this.renderNextButton()}
        </div>
      </div>
    `;
  }

  renderNeedsFields(pageIndex: number) {
    return html`
      <div
        class="column"
        style=${styleMap({
          display: this.currentPage === pageIndex ? 'flex' : 'none',
          gap: '16px',
        })}
      >
        ${this.isProposal
          ? html`
              <span class="title">${msg('Expiration Date')}</span>
              <span class="placeholder"
                >${msg(
                  'Event proposals that have an expiration date will not become actual events if the minimum required participants and needs are not satisfied by the expiration date.'
                )}</span
              >
              <div class="row" style="align-items: center">
                <sl-switch
                  id="expiration-switch"
                  style="margin-right: 16px;"
                  @input=${() => this.requestUpdate()}
                  >${msg('Set an expiration time')}</sl-switch
                >

                <sl-datetime-input
                  name="expiration_time"
                  .label=${msg('Expiration Date')}
                  .required=${(
                    this.shadowRoot?.getElementById(
                      'expiration-switch'
                    ) as SlSwitch
                  )?.checked}
                  .disabled=${!(
                    this.shadowRoot?.getElementById(
                      'expiration-switch'
                    ) as SlSwitch
                  )?.checked}
                  .min=${new Date().toISOString().slice(0, 16)}
                  .max=${(
                    this.shadowRoot?.getElementById('start-time') as SlInput
                  )?.value}
                ></sl-datetime-input>
              </div>
            `
          : html`
              <span class="placeholder"
                >${msg(
                  "When creating an events, you can't specify any need as minimum required, but you can still accept contributions from participants."
                )}</span
              >
            `}

        <span class="title">${msg('Participants')}</span>
        <call-to-action-need-form
          name="participants"
          .disableMinNecessary=${!this.isProposal}
          .hideRequiresAdminApproval=${true}
          id="participants-need"
          .description=${msg('Participants')}
          style="margin-bottom: 24px"
          @sl-change=${() => this.requestUpdate()}
        ></call-to-action-need-form>

        <sl-divider style="margin: 0"></sl-divider>

        <call-to-action-needs-form
          id="other-needs"
          .defaultValue=${[]}
          .allowEmpty=${true}
          .disableMinNecessary=${!this.isProposal}
          .hideRequiresAdminApproval=${!this.isProposal}
          .requiresAdminApprovalLabel=${msg('Requires hosts approval')}
          @sl-change=${() => this.requestUpdate()}
        ></call-to-action-needs-form>

        <div class="row" style="gap: 8px; justify-content: end">
          ${this.renderBackButton()}
          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >
            ${this.isProposal ? msg('Create Proposal') : msg('Create Event')}
          </sl-button>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <sl-card style="display: flex; flex: 1;">
        <span slot="header" style="font-size: 18px"
          >${this.isProposal ? msg('Propose Event') : msg('Create Event')}</span
        >

        <form
          id="form"
          ${onSubmit(f => this.createEvent(f))}
          class="column"
          style="flex: 1"
        >
          ${this.renderIsProposal(0)} ${this.renderHostsFields(1)}
          ${this.renderEventFields(2)} ${this.renderNeedsFields(3)}
        </form>
      </sl-card>
    `;
  }

  static styles = [sharedStyles];
}
