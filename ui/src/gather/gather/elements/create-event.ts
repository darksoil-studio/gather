import { LitElement, html } from 'lit';
import { state, customElement, property } from 'lit/decorators.js';
import { InstalledCell, ActionHash, Record, AgentPubKey, EntryHash, AppWebsocket, InstalledAppInfo } from '@holochain/client';
import { RecordBag, EntryRecord } from '@holochain-open-dev/utils';
import { hashProperty, hashState } from '@holochain-open-dev/elements';
import { contextProvided } from '@lit-labs/context';
import { Snackbar, Button, Card, Formfield } from '@scoped-elements/material-web';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { TextArea } from '@scoped-elements/material-web';
import { UploadFiles, ShowImage } from '@holochain-open-dev/file-storage';
import '@vaadin/date-time-picker/theme/material/vaadin-date-time-picker.js';
import { Checkbox } from '@scoped-elements/material-web';
import { TextField } from '@scoped-elements/material-web';

import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';
import { Event } from '../types';
import { sharedStyles } from '../../../shared-styles';

export class CreateEvent extends ScopedElementsMixin(LitElement) {

  @state()
  _title: string | undefined;

  @state()
  _description: string | undefined;

  @state()
  _image: EntryHash | undefined;

  @state()
  _location: string | undefined;

  @state()
  _startTime: number | undefined;

  @state()
  _endTime: number | undefined;

  @state()
  _private: boolean | undefined;

  @state()
  _cost: string | undefined;


  isEventValid() {
    return true && this._title && this._description && this._image && this._location && this._startTime && this._endTime && this._private !== undefined;
  }

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  async createEvent() {
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
      const record: Record = await this.gatherStore.createEvent(event);

      this.dispatchEvent(new CustomEvent('event-created', {
        composed: true,
        bubbles: true,
        detail: {
          eventHash: record.signed_action.hashed.hash
        }
      }));
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById('create-error') as Snackbar;
      errorSnackbar.labelText = `Error creating the event: ${e.data.data}`;
      errorSnackbar.show();
    }
  }

  render() {
    return html`
      <mwc-snackbar id="create-error" leading>
      </mwc-snackbar>

      <mwc-card style="display: flex; flex: 1;">
        <div style="display: flex; flex: 1; flex-direction: column">
          <span style="font-size: 18px">Create Event</span>
  
          <mwc-textfield outlined label="Title"  @input=${(e: CustomEvent) => { this._title = (e.target as any).value; } }></mwc-textfield>
          <mwc-textarea outlined label="Description"  @input=${(e: CustomEvent) => { this._description = (e.target as any).value;} }></mwc-textarea>
          <upload-files one-file accepted-files="image/jpeg,image/png,image/gif" @file-uploaded=${(e: CustomEvent) => { this._image = e.detail.hash;} }></upload-files>

          <mwc-textfield outlined label="Location"  @input=${(e: CustomEvent) => { this._location = (e.target as any).value; } }></mwc-textfield>
          <vaadin-date-time-picker label="Start Time"  @change=${(e: CustomEvent) => { this._startTime = new Date((e.target as any).value).valueOf() * 1000;} }></vaadin-date-time-picker>
          <vaadin-date-time-picker label="End Time"  @change=${(e: CustomEvent) => { this._endTime = new Date((e.target as any).value).valueOf() * 1000;} }></vaadin-date-time-picker>
          <mwc-formfield label="Private">
            <mwc-checkbox  @input=${(e: CustomEvent) => { this._private = (e.target as any).checked;} }></mwc-checkbox>
          </mwc-formfield>
          <mwc-textfield outlined label="Cost"  @input=${(e: CustomEvent) => { this._cost = (e.target as any).value; } }></mwc-textfield>

          <mwc-button 
            raised
            label="Create Event"
            .disabled=${!this.isEventValid()}
            @click=${() => this.createEvent()}
          ></mwc-button>
        </mwc-card>
    </div>`;
  }
  
  static get scopedElements() {
    return {
      'mwc-snackbar': Snackbar,
      'mwc-button': Button,
      'mwc-card': Card,
      'mwc-textfield': TextField,      'mwc-textarea': TextArea,      'upload-files': UploadFiles,
    'mwc-formfield': Formfield,
      'show-image': ShowImage,          
      'vaadin-date-time-picker': customElements.get('vaadin-date-time-picker'),      
      'mwc-checkbox': Checkbox,        
    };
  }
  
  static styles = [sharedStyles];
}
