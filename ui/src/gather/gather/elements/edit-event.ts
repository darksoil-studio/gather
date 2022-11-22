import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { InstalledCell, ActionHash, Record, EntryHash, AppWebsocket, InstalledAppInfo } from '@holochain/client';
import { RecordBag, EntryRecord } from '@holochain-open-dev/utils';
import { hashState, hashProperty } from '@holochain-open-dev/elements';
import { contextProvided } from '@lit-labs/context';
import { decode } from '@msgpack/msgpack';
import { Button, Formfield, Snackbar } from '@scoped-elements/material-web';

import { TextArea } from '@scoped-elements/material-web';
import { UploadFiles, ShowImage } from '@holochain-open-dev/file-storage';
import '@vaadin/date-time-picker/theme/material/vaadin-date-time-picker.js';
import { Checkbox } from '@scoped-elements/material-web';

import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { Event } from '../types';
import { sharedStyles } from '../../../shared-styles';

export class EditEvent extends LitElement {

  @property(hashProperty('original-event-hash'))
  originalEventHash!: ActionHash;
  
  @property()
  currentRecord!: EntryRecord<Event>;
 
  @contextProvided({ context: gatherStoreContext })
  gatherStore!: GatherStore;
 
  @state()
  _title: string = this.currentRecord.entry.title;

  @state()
  _description: string = this.currentRecord.entry.description;

  @state()
  _image: EntryHash = this.currentRecord.entry.image;

  @state()
  _location: string = this.currentRecord.entry.location;

  @state()
  _startTime: number = this.currentRecord.entry.start_time;

  @state()
  _endTime: number = this.currentRecord.entry.end_time;

  @state()
  _private: boolean = this.currentRecord.entry.private;

  @state()
  _cost: string | undefined = this.currentRecord.entry.cost;


  isEventValid() {
    return true && this._title && this._description && this._image && this._location && this._startTime && this._endTime && this._private !== undefined;
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
  
      this.dispatchEvent(new CustomEvent('event-updated', {
        composed: true,
        bubbles: true,
        detail: {
          originalEventHash: this.originalEventHash,
          previousEventHash: this.currentRecord.actionHash,
          updatedEventHash: updateRecord.actionHash
        }
      }));
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById('update-error') as Snackbar;
      errorSnackbar.labelText = `Error updating the event: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  render() {
    return html`
      <mwc-snackbar id="update-error" leading>
      </mwc-snackbar>

      <div style="display: flex; flex-direction: column">
        <span style="font-size: 18px">Edit Event</span>
        <mwc-textfield outlined label="Title" .value=${ this._title } @input=${(e: CustomEvent) => { this._title = (e.target as any).value; } }></mwc-textfield>
        <mwc-textarea outlined label="Description" .value=${ this._description } @input=${(e: CustomEvent) => { this._description = (e.target as any).value;} }></mwc-textarea>
        <div class="row">
          <show-image .imageHash=${ this._image } style="height: 60px; width: 60px"></show-image>
          <upload-files one-file accepted-files="image/jpeg,image/png,image/gif" @file-uploaded=${(e: CustomEvent) => { this._image = e.detail.hash;} }></upload-files>
        </div>

        <mwc-textfield outlined label="Location" .value=${ this._location } @input=${(e: CustomEvent) => { this._location = (e.target as any).value; } }></mwc-textfield>
        <vaadin-date-time-picker label="Start Time" .value=${new Date(this._startTime / 1000).toISOString()} @change=${(e: CustomEvent) => { this._startTime = new Date((e.target as any).value).valueOf() * 1000;} }></vaadin-date-time-picker>
        <vaadin-date-time-picker label="End Time" .value=${new Date(this._endTime / 1000).toISOString()} @change=${(e: CustomEvent) => { this._endTime = new Date((e.target as any).value).valueOf() * 1000;} }></vaadin-date-time-picker>
        <mwc-formfield label="Private">
          <mwc-checkbox .value=${ this._private } @input=${(e: CustomEvent) => { this._private = (e.target as any).value;} }></mwc-checkbox>
        </mwc-formfield>
        <mwc-textfield outlined label="Cost" .value=${ this._cost } @input=${(e: CustomEvent) => { this._cost = (e.target as any).value; } }></mwc-textfield>


        <div style="display: flex; flex-direction: row">
          <mwc-button
            outlined
            label="Cancel"
            @click=${() => this.dispatchEvent(new CustomEvent('edit-canceled', {
              bubbles: true,
              composed: true
            }))}
            style="flex: 1;"
          ></mwc-button>
          <mwc-button 
            raised
            label="Save"
            .disabled=${!this.isEventValid()}
            @click=${() => this.updateEvent()}
            style="flex: 1;"
          ></mwc-button>
        </div>
      </div>`;
  }
  
  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
    'mwc-formfield': Formfield
,      'mwc-button': Button,
            'mwc-textarea': TextArea,      'upload-files': UploadFiles,
      'show-image': ShowImage,          'vaadin-date-time-picker': customElements.get('vaadin-date-time-picker'),        'mwc-checkbox': Checkbox,         };
  }

  static styles = [sharedStyles];
}
