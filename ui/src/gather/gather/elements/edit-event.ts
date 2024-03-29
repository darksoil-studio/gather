import {
  hashProperty,
  notifyError,
  onSubmit,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';

import '@holochain-open-dev/elements/dist/elements/sl-datetime-input.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event as GatherEvent } from '../types.js';

@localized()
@customElement('edit-event')
export class EditEvent extends LitElement {
  @property(hashProperty('original-event-hash'))
  originalEventHash!: ActionHash;

  @property()
  currentRecord!: EntryRecord<GatherEvent>;

  @consume({ context: gatherStoreContext })
  gatherStore!: GatherStore;

  firstUpdated() {
    this.shadowRoot?.querySelector('form')!.reset();
  }

  @state()
  updating = false;

  async updateEvent(fields: any) {
    if (this.updating) return;
    this.updating = true;

    const event: GatherEvent = {
      ...fields,
      call_to_action_hash: this.currentRecord.entry.call_to_action_hash,
      hosts: this.currentRecord.entry.hosts,
      time: {
        type: 'Unique',
        start_time: new Date(fields.start_time).valueOf() * 1000,
        end_time: new Date(fields.end_time).valueOf() * 1000,
      },
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
            updatedEventHash: updateRecord.actionHash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error updating the event'));
      console.error(e);
    }
    this.updating = false;
  }

  render() {
    return html` <sl-card style="display: flex; flex: 1">
      <span slot="header">${msg('Edit Event')}</span>
      <form
        style="display: flex; flex-direction: column; flex: 1; margin: 0; gap: 16px"
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
          .defaultValue=${this.currentRecord.entry.title}
        ></sl-input>
        <sl-textarea
          name="description"
          required
          .label=${msg('Description')}
          .defaultValue=${this.currentRecord.entry.description}
        ></sl-textarea>

        <sl-datetime-input
          name="start_time"
          required
          id="start-time"
          .defaultValue=${new Date(
            this.currentRecord.entry.time.start_time / 1000
          )}
          .label=${msg('Start Time')}
          style="flex: 1;"
          @input=${() => this.requestUpdate()}
        ></sl-datetime-input>
        <sl-datetime-input
          required
          .min=${(this.shadowRoot?.getElementById('start-time') as SlInput)
            ?.value}
          name="end_time"
          .defaultValue=${new Date(
            (this.currentRecord.entry.time as any).end_time / 1000
          )}
          .label=${msg('End Time')}
          style="flex: 1;"
        ></sl-datetime-input>

        <sl-input
          name="location"
          required
          .label=${msg('Location')}
          .defaultValue=${this.currentRecord.entry.location}
        ></sl-input>
        <sl-input
          name="cost"
          .label=${msg('Cost')}
          .defaultValue=${this.currentRecord.entry.cost || ''}
        ></sl-input>

        <div style="display: flex; flex-direction: row; gap: 8px">
          <sl-button
            style="flex: 1;"
            @click=${() => {
              this.dispatchEvent(
                new CustomEvent('edit-cancelled', {
                  bubbles: true,
                  composed: true,
                })
              );
            }}
          >
            ${msg('Go Back')}
          </sl-button>
          <sl-button
            variant="primary"
            type="submit"
            style="flex: 1;"
            .loading=${this.updating}
          >
            ${msg('Save')}
          </sl-button>
        </div>
      </form></sl-card
    >`;
  }

  static styles = [sharedStyles];
}
