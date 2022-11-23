import { hashProperty, hashState } from '@holochain-open-dev/elements';
import { ShowImage, UploadFiles } from '@holochain-open-dev/file-storage';
import { EntryRecord, RecordBag } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AppWebsocket,
  EntryHash,
  InstalledAppInfo,
  InstalledCell,
  Record,
} from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { decode } from '@msgpack/msgpack';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  Button,
  Card,
  Formfield,
  Snackbar,
  TextField,
} from '@scoped-elements/material-web';
import { TextArea } from '@scoped-elements/material-web';
import { Checkbox } from '@scoped-elements/material-web';
import '@vaadin/date-time-picker/theme/material/vaadin-date-time-picker.js';
import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import { Event } from '../types';

export class EditEvent extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('original-event-hash'))
  originalEventHash!: ActionHash;

  @property()
  currentRecord!: EntryRecord<Event>;

  @contextProvided({ context: gatherStoreContext })
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

  isEventValid() {
    return (
      true &&
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
      const updateRecord = await this.gatherStore.updateEvent(
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
      const errorSnackbar = this.shadowRoot?.getElementById(
        'update-error'
      ) as Snackbar;
      errorSnackbar.labelText = `Error updating the event: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  render() {
    return html` <mwc-snackbar id="update-error" leading> </mwc-snackbar>

      <mwc-card style="display: flex; flex: 1">
      <div style="display: flex; flex-direction: column; margin: 16px;">
        <span style="font-size: 18px; margin-bottom: 16px">Edit Event</span>
  
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

          <mwc-textfield outlined label="Title" style="margin-bottom: 16px" .value=${this._title} @input=${(e: CustomEvent) => {
        this._title = (e.target as any).value;
      }}></mwc-textfield>
          <mwc-textarea outlined label="Description" style="margin-bottom: 16px" .value=${this._description} @input=${(
        e: CustomEvent
      ) => {
        this._description = (e.target as any).value;
      }}></mwc-textarea>

        <div style="display: flex; flex: 1; flex-direction: row">
        <div style="display: flex; flex: 1; flex-direction: column; margin-right: 16px;">
          <mwc-textfield outlined label="Location" style="margin-bottom: 16px" .value=${this._location} @input=${(
        e: CustomEvent
      ) => {
        this._location = (e.target as any).value;
      }}></mwc-textfield>
          <vaadin-date-time-picker label="Start Time" style="margin-bottom: 16px"  
      
          .value=${new Date(this._startTime / 1000).toISOString()}
      @change=${(
        e: CustomEvent
      ) => {
        this._startTime =
          new Date((e.target as any).value).valueOf() * 1000;
      }}></vaadin-date-time-picker>
          <vaadin-date-time-picker label="End Time" 
          .value=${new Date(this._endTime / 1000).toISOString()}
       @change=${(
        e: CustomEvent
      ) => {
        this._endTime = new Date((e.target as any).value).valueOf() * 1000;
      }}></vaadin-date-time-picker>
      
      </div>
      
      <div class="column" style="flex: 1">
          <mwc-textfield outlined label="Cost" .value=${this._cost || ''} @input=${(e: CustomEvent) => {
        this._cost = (e.target as any).value;
      }}></mwc-textfield>
          <mwc-formfield label="Private Event">
            <mwc-checkbox .checked=${this._private} @input=${(e: CustomEvent) => {
        this._private = (e.target as any).checked;
      }}></mwc-checkbox>
          </mwc-formfield>
</div>      
      </div>

              <div style="display: flex; flex-direction: row">
          <mwc-button
            outlined
            label="Cancel"
            @click=${() =>
        this.dispatchEvent(
          new CustomEvent('edit-canceled', {
            bubbles: true,
            composed: true,
          })
        )}
            style="flex: 1; margin-right: 16px"
          ></mwc-button>
          <mwc-button
            raised
            label="Save"
            .disabled=${!this.isEventValid()}
            @click=${() => this.updateEvent()}
            style="flex: 1;"
          ></mwc-button>
        </div>
      </div></mwc-card>`;
  }

  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-formfield': Formfield,
      'mwc-card': Card,
      'mwc-textfield': TextField,
      'mwc-button': Button,
      'vaadin-date-time-picker': customElements.get('vaadin-date-time-picker'),
      'mwc-textarea': TextArea,
      'upload-files': UploadFiles,
      'show-image': ShowImage,
      'mwc-checkbox': Checkbox,
    };
  }

  static styles = [sharedStyles];
}
