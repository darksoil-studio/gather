import {
  FormField,
  FormFieldController,
  notifyError,
  onSubmit,
  serialize,
  sharedStyles,
} from '@holochain-open-dev/elements';
import { Record } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';

import '@darksoil/assemble/dist/elements/call-to-action-need-form.js';
import '@darksoil/assemble/dist/elements/call-to-action-needs-form.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';
import { CallToAction, Need } from '@darksoil/assemble';
import { encode } from '@msgpack/msgpack';

@localized()
@customElement('create-event')
export class CreateEvent extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state()
  committing = false;

  async createEvent(fields: any) {
    if (this.committing) return;

    const needsFields = fields.need
      ? Array.isArray(fields.need)
        ? fields.need
        : [fields.need]
      : [];

    const needs: Array<Need> = needsFields.map((n: string) => JSON.parse(n));
    needs.unshift(JSON.parse(fields.participants));

    this.committing = true;

    try {
      const callToAction: CallToAction = {
        custom_content: encode({}),
        expiration_time: undefined, //Date.now() * 1000 + 60 * 1000 * 1000,
        needs,
        parent_call_to_action_hash: undefined,
      };

      const callToActionEntryRecord =
        await this.gatherStore.assembleStore.client.createCallToAction(
          callToAction
        );

      const event: Event = {
        ...fields,
        start_time: new Date(fields.start_time).valueOf() * 1000,
        end_time: new Date(fields.end_time).valueOf() * 1000,
        call_to_action_hash: callToActionEntryRecord.actionHash,
      };
      const record: Record = await this.gatherStore.client.createEvent(event);

      this.dispatchEvent(
        new CustomEvent('event-created', {
          composed: true,
          bubbles: true,
          detail: {
            eventHash: record.signed_action.hashed.hash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error creating the event'));
      console.error(e);
    }
    this.committing = false;
  }

  render() {
    return html`
      <sl-card style="display: flex; flex: 1;">
        <span slot="header" style="font-size: 18px"
          >${msg('Create Event')}</span
        >
        <form
          class="column"
          style=" flex: 1;"
          ${onSubmit(f => this.createEvent(f))}
        >
          <div class="row" style="flex: 1">
            <div class="column" style="margin-right: 24px">
              <span style="margin-bottom: 16px">${msg('Event Image')}</span>
              <upload-files
                name="image"
                required
                style="margin-bottom: 16px; display: flex"
                one-file
                accepted-files="image/jpeg,image/png,image/gif"
              ></upload-files>

              <sl-input
                name="title"
                required
                .label=${msg('Title')}
                style="margin-bottom: 16px"
              ></sl-input>
              <sl-textarea
                name="description"
                required
                .label=${msg('Description')}
                style="margin-bottom: 16px"
              ></sl-textarea>

              <div class="row" style="margin-bottom: 16px">
                <sl-input
                  name="location"
                  required
                  .label=${msg('Location')}
                  style="margin-right: 16px; flex: 1"
                ></sl-input>
                <sl-input
                  name="cost"
                  .label=${msg('Cost')}
                  style="flex: 1"
                ></sl-input>
              </div>

              <div class="row" style="margin-bottom: 16px">
                <sl-input
                  type="datetime-local"
                  name="start_time"
                  required
                  .label=${msg('Start Time')}
                  style="margin-right: 16px; flex: 1"
                ></sl-input>
                <sl-input
                  type="datetime-local"
                  name="end_time"
                  required
                  .label=${msg('End Time')}
                  style="flex: 1"
                ></sl-input>
              </div>
            </div>

            <div class="column">
              <span class="title">${msg('Participants')}</span>
              <call-to-action-need-form
                name="participants"
                .description=${msg('Participants')}
                style="margin-bottom: 16px"
              ></call-to-action-need-form>

              <call-to-action-needs-form
                .defaultValue=${[]}
                .allowEmpty=${true}
              ></call-to-action-needs-form>
            </div>
          </div>

          <sl-button
            variant="primary"
            style="margin-top: 16px;"
            type="submit"
            .loading=${this.committing}
          >
            ${msg('Create Event')}
          </sl-button>
        </form>
      </sl-card>
    `;
  }

  static styles = [sharedStyles];
}
