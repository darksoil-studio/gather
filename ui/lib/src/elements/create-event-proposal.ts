import { sharedStyles } from '@holochain-open-dev/elements';
import { localized, msg } from '@lit/localize';
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';

import 'lit-flatpickr';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/elements/upload-files.js';
import '@darksoil/assemble/elements/create-call-to-action.js';
//@ts-ignore
import { CreateCallToAction } from '@darksoil/assemble/elements/create-call-to-action.js';

//@ts-ignore
@localized()
//@ts-ignore
@customElement('create-event-proposal')
export class CreateEventProposal extends CreateCallToAction {
  customCallToActionName() {
    return msg('Event Proposal');
  }

  async createCallToAction(fields: any) {
    fields.start_time = new Date(fields.start_time).valueOf() * 1000;
    fields.end_time = new Date(fields.end_time).valueOf() * 1000;

    super.createCallToAction(fields);
  }

  renderCustomContentFormFields() {
    return html`
      <div style="display: flex; flex: 1; flex-direction: column;">
        <span style="margin: 8px 0 ">${msg('Event Image')}</span>
        <upload-files
          name="image"
          required
          style="margin-bottom: 16px; display: flex"
          one-file
          accepted-files="image/jpeg,image/png,image/gif"
        ></upload-files>

        <sl-textarea
          name="description"
          required
          .label=${msg('Description')}
          style="margin-bottom: 16px"
        ></sl-textarea>

        <div
          style="display: flex; flex: 1; flex-direction: row; margin-bottom: 16px"
        >
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
        <div style="display: flex; flex: 1; flex-direction: row">
          <lit-flatpickr
            .dateFormat=${'Y-m-d H:i'}
            .enableTime=${true}
            style="flex: 1; margin-right: 16px"
          >
            <sl-input
              name="start_time"
              id="start-time"
              required
              .label=${msg('Start Time')}
              @sl-input=${() => {
                //@ts-ignore
                this.requestUpdate();
              }}
            ></sl-input
          ></lit-flatpickr>
          <lit-flatpickr
            .dateFormat=${'Y-m-d H:i'}
            .enableTime=${true}
            style="flex: 1"
            .minDate=${new Date(
              //@ts-ignore
              (this.shadowRoot?.getElementById('start-time') as any)?.value
            ).valueOf()}
          >
            <sl-input
              required
              .disabled=${!//@ts-ignore
              (this.shadowRoot?.getElementById('start-time') as any)?.value}
              name="end_time"
              .label=${msg('End Time')}
            ></sl-input
          ></lit-flatpickr>
        </div>
      </div>
    `;
  }

  static styles = [sharedStyles];
}
