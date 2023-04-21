import {
  hashProperty,
  notifyError,
  onSubmit,
  sharedStyles,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import 'lit-flatpickr';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';

@localized()
@customElement('edit-event')
export class EditEvent extends LitElement {
  @property(hashProperty('original-event-hash'))
  originalEventHash!: ActionHash;

  @property()
  currentRecord!: EntryRecord<Event>;

  @consume({ context: gatherStoreContext })
  gatherStore!: GatherStore;

  firstUpdated() {
    this.shadowRoot?.querySelector('form')!.reset();
  }

  async updateEvent(fields: any) {
    const event: Event = {
      ...fields,
      start_time: new Date(fields.start_time).valueOf() * 1000,
      end_time: new Date(fields.end_time).valueOf() * 1000,
    };

    try {
      const updateRecord = await this.gatherStore.client.updateEvent(
        this.originalEventHash,
        this.currentRecord.actionHash,
        event
      );

      this.dispatchEvent(
        new CustomEvent('event-updated', {
          composed: true,
          bubbles: true,
          detail: {
            originalEventHash: this.originalEventHash,
            previousEventHash: this.currentRecord.actionHash,
            updatedEventHash: updateRecord.signed_action.hashed.hash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error updating the event'));
      console.error(e);
    }
  }

  render() {
    return html` <sl-card style="display: flex; width: 700px">
      <span slot="header">${msg('Edit Event')}</span>
      <form
        style="display: flex; flex-direction: column;"
        ${onSubmit(fields => this.updateEvent(fields))}
      >
        <upload-files
          name="image"
          required
          one-file
          .defaultValue=${this.currentRecord.entry.image}
          accepted-files="image/jpeg,image/png,image/gif"
        ></upload-files>

        <sl-input
          name="title"
          required
          .label=${msg('Title')}
          style="margin-bottom: 16px; margin-top: 16px"
          .defaultValue=${this.currentRecord.entry.title}
        ></sl-input>
        <sl-input
          name="description"
          required
          .label=${msg('Description')}
          style="margin-bottom: 16px"
          .defaultValue=${this.currentRecord.entry.description}
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
              .defaultValue=${this.currentRecord.entry.location}
            ></sl-input>
            <lit-flatpickr
              .dateFormat=${'Y-m-d H:i'}
              .enableTime=${true}
              class="column"
              style="width: 100%"
            >
              <sl-input
                name="start_time"
                required
                .defaultValue=${new Date(
                  this.currentRecord.entry.start_time / 1000
                ).toISOString()}
                .label=${msg('Start Time')}
                style="flex: 1; margin-bottom: 16px"
              ></sl-input
            ></lit-flatpickr>
            <lit-flatpickr
              .dateFormat=${'Y-m-d H:i'}
              .enableTime=${true}
              class="column"
              style="width: 100%"
            >
              <sl-input
                required
                name="end_time"
                .defaultValue=${new Date(
                  this.currentRecord.entry.end_time / 1000
                ).toISOString()}
                .label=${msg('End Time')}
                style="flex: 1; margin-bottom: 16px"
              ></sl-input
            ></lit-flatpickr>
          </div>

          <div class="column" style="flex: 1">
            <sl-input
              name="cost"
              .label=${msg('Cost')}
              .defaultValue=${this.currentRecord.entry.cost || ''}
            ></sl-input>
          </div>
        </div>

        <div style="display: flex; flex-direction: row">
          <sl-button
            @click=${() =>
              this.dispatchEvent(
                new CustomEvent('edit-canceled', {
                  bubbles: true,
                  composed: true,
                })
              )}
            style="flex: 1; margin-right: 16px"
          >
            ${msg('Cancel')}
          </sl-button>
          <sl-button variant="primary" type="submit" style="flex: 1;">
            ${msg('Save')}
          </sl-button>
        </div>
      </form></sl-card
    >`;
  }

  static styles = [sharedStyles];
}
