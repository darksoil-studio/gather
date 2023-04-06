import {
  notifyError,
  onSubmit,
  sharedStyles,
} from '@holochain-open-dev/elements';
import { EntryHash, Record } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import 'lit-flatpickr';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/elements/upload-files.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';

@localized()
@customElement('create-event')
export class CreateEvent extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state()
  committing = false;

  async createEvent(fields: any) {
    if (this.committing) return;
    this.committing = true;
    const event: Event = {
      ...fields,
      private: fields.private === 'on',
      start_time: new Date(fields.start_time).valueOf() * 1000,
      end_time: new Date(fields.end_time).valueOf() * 1000,
    };

    try {
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
          style="display: flex; flex: 1; flex-direction: column;"
          ${onSubmit(f => this.createEvent(f))}
        >
          <span style="margin: 8px 0 ">${msg('Event Image')}</span>
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
          <sl-input
            name="description"
            required
            .label=${msg('Description')}
            style="margin-bottom: 16px"
          ></sl-input>

          <div style="display: flex; flex: 1; flex-direction: row">
            <div
              style="display: flex; flex: 1; flex-direction: column; margin-right: 16px;"
            >
              <sl-input
                name="location"
                required
                .label=${msg('Location')}
                style="margin-bottom: 16px"
              ></sl-input>
              <lit-flatpickr .dateFormat=${'Y-m-d H:i'} .enableTime=${true}>
                <sl-input
                  name="start_time"
                  required
                  .label=${msg('Start Time')}
                  style="margin-bottom: 16px"
                ></sl-input
              ></lit-flatpickr>
              <lit-flatpickr .dateFormat=${'Y-m-d H:i'} .enableTime=${true}>
                <sl-input
                  required
                  name="end_time"
                  .label=${msg('End Time')}
                ></sl-input
              ></lit-flatpickr>
            </div>

            <div class="column" style="flex: 1">
              <sl-input name="cost" .label=${msg('Cost')}></sl-input>
              <sl-checkbox name="private">
                ${msg('Private Event')}
              </sl-checkbox>
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
