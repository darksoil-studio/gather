import {
  notifyError,
  onSubmit,
  sharedStyles,
} from '@holochain-open-dev/elements';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';
import '@holochain-open-dev/elements/dist/elements/sl-datetime-input.js';

import '@darksoil/assemble/dist/elements/call-to-action-need-form.js';
import '@darksoil/assemble/dist/elements/call-to-action-needs-form.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';
import { CallToAction, Need } from '@darksoil/assemble';
import { encode } from '@msgpack/msgpack';
import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
import { SlSwitch } from '@shoelace-style/shoelace';
import { CallToActionNeedForm } from '@darksoil/assemble/dist/elements/call-to-action-need-form.js';
import { CallToActionNeedsForm } from '@darksoil/assemble/dist/elements/call-to-action-needs-form.js';
import { EntryRecord } from '@holochain-open-dev/utils';

@localized()
@customElement('create-event')
export class CreateEvent extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state()
  committing = false;

  @state()
  page: 'event-form' | 'needs-form' = 'event-form';

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
        custom_content: encode({}),
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

      const isProposal = fields.proposal === 'on';

      if (isProposal) {
        if (participantsNeeds.min_necessary === 0) {
          await this.gatherStore.assembleStore.client.createSatisfaction({
            call_to_action_hash: callToActionEntryRecord.actionHash,
            commitments_hashes: [],
            need_index: 0,
          });
        }
      } else {
        await this.gatherStore.assembleStore.client.closeCallToAction(
          callToActionEntryRecord.actionHash
        );
        await this.gatherStore.assembleStore.client.createAssembly({
          call_to_action_hash: callToActionEntryRecord.actionHash,
          satisfactions_hashes: [],
        });
      }

      const event: Event = {
        ...fields,
        start_time: new Date(fields.start_time).valueOf() * 1000,
        end_time: new Date(fields.end_time).valueOf() * 1000,
        call_to_action_hash: callToActionEntryRecord.actionHash,
      };
      let eventRecord: EntryRecord<Event>;
      if (isProposal) {
        eventRecord = await this.gatherStore.client.createEventProposal(event);
      } else {
        eventRecord = await this.gatherStore.client.createEvent(event);
      }

      await this.gatherStore.commitToParticipate(eventRecord);

      this.dispatchEvent(
        new CustomEvent('event-created', {
          composed: true,
          bubbles: true,
          detail: {
            eventHash: eventRecord.actionHash,
            isProposal,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error creating the event'));
      console.error(e);
    }
    this.committing = false;
  }

  renderEventFields() {
    return html`
      <div
        class="column"
        style=${styleMap({
          display: this.page === 'event-form' ? 'flex' : 'none',
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
            required
            .label=${msg('Start Time')}
            style="flex: 1"
            id="start-time"
            @input=${() => this.requestUpdate()}
          ></sl-datetime-input>
          <sl-datetime-input
            name="end_time"
            required
            .label=${msg('End Time')}
            style="flex: 1"
            .min=${(this.shadowRoot?.getElementById('start-time') as SlInput)
              ?.value}
          ></sl-datetime-input>
        </div>

        <div class="row" style="gap: 16px; flex-wrap: wrap;">
          <sl-input
            name="location"
            required
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
          <sl-button
            @click=${() => {
              const form = this.shadowRoot?.getElementById('form') as
                | HTMLFormElement
                | undefined;
              if (form) {
                if (form.reportValidity()) {
                  this.page = 'needs-form';
                }
              }
            }}
            >${msg('Next')}</sl-button
          >
        </div>
      </div>
    `;
  }

  renderNeedsFields() {
    let proposalFieldRequired = false;

    const participantsNeedForm = this.shadowRoot?.getElementById(
      'participants-need'
    ) as CallToActionNeedForm | undefined;
    const otherNeedsForms = this.shadowRoot?.getElementById('other-needs') as
      | CallToActionNeedsForm
      | undefined;

    if (participantsNeedForm && otherNeedsForms) {
      const needs: Need[] = [
        participantsNeedForm.value,
        ...otherNeedsForms.needForms().map(f => f.value),
      ].map(s => JSON.parse(s));
      if (needs.some(n => n.min_necessary > 0)) {
        proposalFieldRequired = true;
      }
    }

    return html`
      <div
        class="column"
        style=${styleMap({
          display: this.page === 'needs-form' ? 'flex' : 'none',
        })}
      >
        <div class="column">
          <sl-switch
            id="proposal-field"
            name="proposal"
            .required=${proposalFieldRequired}
            style="margin-bottom: 16px;"
            @input=${() => this.requestUpdate()}
            >${msg('This an event proposal')}</sl-switch
          >

          <span style="margin-bottom: 24px" class="placeholder"
            >${msg(
              "Event proposals will only actually happen if the minimum required needs for the events are fulfilled by other people's commitments."
            )}</span
          >

          <span class="title" style="margin-bottom: 16px"
            >${msg('Expiration Date')}</span
          >
          <span style="margin-bottom: 16px" class="placeholder"
            >${msg(
              'Event proposals that have an expiration date will not happen if the minimum required participants ands needs are not satisfied by the expiration date.'
            )}</span
          >
          <div class="row" style="margin-bottom: 24px; align-items: center">
            <sl-switch
              id="expiration-switch"
              style="margin-right: 16px;"
              @input=${() => this.requestUpdate()}
              .disabled=${!(
                this.shadowRoot?.getElementById('proposal-field') as SlSwitch
              )?.checked}
              >${msg('Set an expiration time')}</sl-switch
            >

            <sl-datetime-input
              name="expiration_time"
              .label=${msg('Expiration Date')}
              .required=${(
                this.shadowRoot?.getElementById('expiration-switch') as SlSwitch
              )?.checked}
              .disabled=${!(
                this.shadowRoot?.getElementById('expiration-switch') as SlSwitch
              )?.checked ||
              !(this.shadowRoot?.getElementById('proposal-field') as SlSwitch)
                ?.checked}
              .min=${new Date().toISOString().slice(0, 16)}
              .max=${(this.shadowRoot?.getElementById('start-time') as SlInput)
                ?.value}
            ></sl-datetime-input>
          </div>

          <span class="title">${msg('Participants')}</span>
          <call-to-action-need-form
            name="participants"
            id="participants-need"
            .description=${msg('Participants')}
            style="margin-bottom: 24px"
            @sl-change=${() => this.requestUpdate()}
          ></call-to-action-need-form>

          <call-to-action-needs-form
            id="other-needs"
            .defaultValue=${[]}
            .allowEmpty=${true}
            @sl-change=${() => this.requestUpdate()}
          ></call-to-action-needs-form>
        </div>

        <div class="row" style="margin-top: 16px; justify-content: end">
          <sl-button
            @click=${() => {
              this.page = 'event-form';
            }}
            style="margin-right: 16px"
          >
            ${msg('Back')}
          </sl-button>
          <sl-button
            variant="primary"
            type="submit"
            .loading=${this.committing}
          >
            ${msg('Create Event')}
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
          ${this.renderEventFields()} ${this.renderNeedsFields()}
        </form>
      </sl-card>
    `;
  }

  static styles = [sharedStyles];
}
