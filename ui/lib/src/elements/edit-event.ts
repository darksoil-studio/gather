import { hashProperty, sharedStyles } from '@holochain-open-dev/elements';
import { ShowImage, UploadFiles } from '@holochain-open-dev/file-storage';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, EntryHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  MdOutlinedButton,
  MdFilledButton,
  Card,
  Snackbar,
} from '@scoped-elements/material-web';
import { MdOutlinedTextField } from '@scoped-elements/material-web';
import { MdCheckbox } from '@scoped-elements/material-web';
import 'lit-flatpickr';
import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';

import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { Event } from '../types';

@localized()
export class EditEvent extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('original-event-hash'))
  originalEventHash!: ActionHash;

  @property()
  currentRecord!: EntryRecord<Event>;

  @consume({ context: gatherStoreContext })
  gatherStore!: GatherStore;

  @state()
  _title!: string;

  @state()
  _description!: string;

  @state()
  _image!: EntryHash;

  @state()
  _location!: string;

  @state()
  _startTime!: number;

  @state()
  _endTime!: number;

  @state()
  _private!: boolean;

  @state()
  _cost: string | undefined;

  connectedCallback() {
    super.connectedCallback();
    this._title = this.currentRecord.entry.title;
    this._description = this.currentRecord.entry.description;
    this._image = this.currentRecord.entry.image;
    this._location = this.currentRecord.entry.location;
    this._startTime = this.currentRecord.entry.start_time;
    this._endTime = this.currentRecord.entry.end_time;
    this._private = this.currentRecord.entry.private;
    this._cost = this.currentRecord.entry.cost;
  }

  firstUpdated() {
    (this.shadowRoot?.getElementById('start-time-field') as any).value =
      new Date(this._startTime / 1000).toISOString();
    (this.shadowRoot?.getElementById('end-time-field') as any).value = new Date(
      this._endTime / 1000
    ).toISOString();
  }

  isEventValid() {
    return (
      this._title &&
      this._description &&
      this._image &&
      this._location &&
      this._startTime &&
      this._endTime &&
      this._private !== undefined
    );
  }

  async updateEvent() {
    const event: Event = {
      title: this._title!,
      description: this._description!,
      image: this._image!,
      location: this._location!,
      start_time: this._startTime!,
      end_time: this._endTime!,
      private: this._private!,
      cost: this._cost,
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
      const errorSnackbar = this.shadowRoot?.getElementById(
        'update-error'
      ) as Snackbar;
      errorSnackbar.labelText = `${msg('Error updating the event')}: ${
        e.data.data
      }`;
      errorSnackbar.show();
    }
  }

  render() {
    return html` <mwc-snackbar id="update-error" leading> </mwc-snackbar>

      <mwc-card style="display: flex; flex: 1">
        <div style="display: flex; flex-direction: column; margin: 16px;">
          <span style="font-size: 18px; margin-bottom: 16px"
            >${msg('Edit Event')}</span
          >

          <div class="row" style="margin-bottom: 16px">
            <show-image
              .imageHash=${this._image}
              style="height: 200px"
            ></show-image>
            <upload-files
              one-file
              accepted-files="image/jpeg,image/png,image/gif"
              @file-uploaded=${(e: CustomEvent) => {
                this._image = e.detail.hash;
              }}
            ></upload-files>
          </div>

          <md-outlined-text-field
            .label=${msg('Title')}
            style="margin-bottom: 16px"
            .value=${this._title}
            @input=${(e: CustomEvent) => {
              this._title = (e.target as any).value;
            }}
          ></md-outlined-text-field>
          <md-outlined-text-field
            .label=${msg('Description')}
            style="margin-bottom: 16px"
            .value=${this._description}
            @input=${(e: CustomEvent) => {
              this._description = (e.target as any).value;
            }}
          ></md-outlined-text-field>

          <div style="display: flex; flex: 1; flex-direction: row">
            <div
              style="display: flex; flex: 1; flex-direction: column; margin-right: 16px;"
            >
              <md-outlined-text-field
                .label=${msg('Location')}
                style="margin-bottom: 16px"
                .value=${this._location}
                @input=${(e: CustomEvent) => {
                  this._location = (e.target as any).value;
                }}
              ></md-outlined-text-field>
              <lit-flatpickr
                .dateFormat=${'Y-m-d H:i'}
                .enableTime=${true}
                .onClose=${(e: any) => {
                  this._startTime = new Date(e[0]).valueOf() * 1000;
                }}
                class="column"
                style="width: 100%"
              >
                <md-outlined-text-field
                  id="start-time-field"
                  .label=${msg('Start Time')}
                  style="flex: 1; margin-bottom: 16px"
                ></md-outlined-text-field
              ></lit-flatpickr>
              <lit-flatpickr
                .dateFormat=${'Y-m-d H:i'}
                .enableTime=${true}
                .onClose=${(e: any) => {
                  this._endTime = new Date(e[0]).valueOf() * 1000;
                }}
                class="column"
                style="width: 100%"
              >
                <md-outlined-text-field
                  id="end-time-field"
                  .label=${msg('End Time')}
                  style="flex: 1; margin-bottom: 16px"
                ></md-outlined-text-field
              ></lit-flatpickr>
            </div>

            <div class="column" style="flex: 1">
              <md-outlined-text-field
                .label=${msg('Cost')}
                .value=${this._cost || ''}
                @input=${(e: CustomEvent) => {
                  this._cost = (e.target as any).value;
                }}
              ></md-outlined-text-field>
              <label class="row" style="align-items:center">
                <md-checkbox
                  .checked=${this._private}
                  @input=${(e: CustomEvent) => {
                    this._private = (e.target as any).checked;
                  }}
                ></md-checkbox>
                ${msg('Private Event')}</label
              >
            </div>
          </div>

          <div style="display: flex; flex-direction: row">
            <md-outlined-button
              .label=${msg('Cancel')}
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('edit-canceled', {
                    bubbles: true,
                    composed: true,
                  })
                )}
              style="flex: 1; margin-right: 16px"
            ></md-outlined-button>
            <md-filled-button
              .label=${msg('Save')}
              .disabled=${!this.isEventValid()}
              @click=${() => this.updateEvent()}
              style="flex: 1;"
            ></md-filled-button>
          </div></div
      ></mwc-card>`;
  }

  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-card': Card,
      'md-outlined-text-field': MdOutlinedTextField,
      'md-outlined-button': MdOutlinedButton,
      'md-filled-button': MdFilledButton,
      'lit-flatpickr': customElements.get('lit-flatpickr'),
      'upload-files': UploadFiles,
      'show-image': ShowImage,
      'md-checkbox': MdCheckbox,
    };
  }

  static styles = [sharedStyles];
}
