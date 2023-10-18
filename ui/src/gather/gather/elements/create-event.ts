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

import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import '@holochain-open-dev/elements/dist/elements/sl-datetime-input.js';
import '@holochain-open-dev/profiles/dist/elements/search-agent.js';

import '@darksoil/assemble/dist/elements/call-to-action-need-form.js';
import '@darksoil/assemble/dist/elements/call-to-action-needs-form.js';

import { CallToAction, Need } from '@darksoil/assemble';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
import { SlSwitch } from '@shoelace-style/shoelace';
import { CallToActionNeedForm } from '@darksoil/assemble/dist/elements/call-to-action-need-form.js';
import { CallToActionNeedsForm } from '@darksoil/assemble/dist/elements/call-to-action-needs-form.js';
import { EntryRecord } from '@holochain-open-dev/utils';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event, Proposal } from '../types.js';
import { AgentPubKey } from '@holochain/client';

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

    const needs: Array<Need> = needsFields.map((n: string) => JSON.parse(n));
    const participantsNeeds: Need = JSON.parse(fields.participants);

    needs.unshift(participantsNeeds);

    this.committing = true;
    try {
      const callToAction: CallToAction = {
        admins: fields.hosts,
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
        const time = fields.start_time
          ? {
              type: 'Unique',
              start_time: new Date(fields.start_time).valueOf() * 1000,
              end_time: new Date(fields.end_time).valueOf() * 1000,
            }
          : undefined;
        const proposal: Proposal = {
          ...fields,
          time,
          call_to_action_hash: callToActionEntryRecord.actionHash,
        };
        eventRecord = await this.gatherStore.client.createProposal(proposal);
      } else {
        const event: Event = {
          ...fields,
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

      await this.gatherStore.assembleStore.client.createCommitment({
        amount: 1,
        call_to_action_hash: eventRecord.entry.call_to_action_hash,
        comment: '',
        need_index: 0,
      });

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
            if (form.reportValidity()) {
              this.currentPage += 1;
            }
          }
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
            'Do you want to create an actual event, or do you want to propose an event?'
          )}</span
        >

        <span class="placeholder"
          >${msg(
            "Proposals will only become actual events if the minimum required needs for the events are fulfilled by other people's commitments, and when a specific time and place for the event has been decided."
          )}</span
        >
        <div class="row" style="gap: 16px;">
          <sl-button
            style="flex: 1"
            @click=${() => {
              this.isProposal = true;
              this.currentPage += 1;
            }}
          >
            ${msg('Propose Event')}
          </sl-button>
          <sl-button
            style="flex: 1"
            @click=${() => {
              this.isProposal = false;
              this.currentPage += 1;
            }}
          >
            ${msg('Create Event')}
          </sl-button>
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
        <search-agents name="hosts"></search-agents>

        <div class="row" style="gap: 16px; justify-content: end">
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
        <span>${msg('Event Image')}</span>
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

        <div class="row" style="gap: 16px; flex-wrap: wrap;">
          <sl-datetime-input
            name="start_time"
            .min=${new Date().toISOString().slice(0, 16)}
            .required=${!this.isProposal}
            .label=${msg('Start Time')}
            style="flex: 1"
            id="start-time"
            @input=${() => this.requestUpdate()}
          ></sl-datetime-input>
          <sl-datetime-input
            name="end_time"
            .required=${!this.isProposal}
            .label=${msg('End Time')}
            style="flex: 1"
            .min=${(this.shadowRoot?.getElementById('start-time') as SlInput)
              ?.value}
          ></sl-datetime-input>
        </div>

        <div class="row" style="gap: 16px; flex-wrap: wrap;">
          <sl-input
            name="location"
            .required=${!this.isProposal}
            .label=${msg('Location')}
            style="flex: 1"
          ></sl-input>
          <sl-input
            name="cost"
            .label=${msg('Cost')}
            style="flex: 1"
          ></sl-input>
        </div>
        <div class="row" style="justify-content: end">
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
        })}
      >
        <div class="column" style="gap: 16px">
          <span class="title">${msg('Needs')}</span>
          ${this.isProposal
            ? html`
                <span class="title" style="margin-bottom: 16px"
                  >${msg('Expiration Date')}</span
                >
                <span style="margin-bottom: 16px" class="placeholder"
                  >${msg(
                    'Event proposals that have an expiration date will not become actual events if the minimum required participants and needs are not satisfied by the expiration date.'
                  )}</span
                >
                <div
                  class="row"
                  style="margin-bottom: 24px; align-items: center"
                >
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
            : html``}

          <span class="title">${msg('Participants')}</span>
          <call-to-action-need-form
            name="participants"
            .hideRequestAdminApproval=${true}
            id="participants-need"
            .description=${msg('Participants')}
            style="margin-bottom: 24px"
            @sl-change=${() => this.requestUpdate()}
          ></call-to-action-need-form>

          <call-to-action-needs-form
            id="other-needs"
            .defaultValue=${[]}
            .allowEmpty=${true}
            .requestAdminApprovalLabel=${msg('Requires hosts approval')}
            @sl-change=${() => this.requestUpdate()}
          ></call-to-action-needs-form>
        </div>

        <div class="row" style="gap: 16px; justify-content: end">
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
          >${msg('Create Event')}</span
        >

        <form id="form" ${onSubmit(f => this.createEvent(f))} class="column">
          ${this.renderIsProposal(0)} ${this.renderHostsFields(1)}
          ${this.renderEventFields(2)} ${this.renderNeedsFields(3)}
        </form>
      </sl-card>
    `;
  }

  static styles = [sharedStyles];
}
