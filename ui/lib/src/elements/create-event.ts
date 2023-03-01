import { sharedStyles } from "@holochain-open-dev/elements";
import { ShowImage, UploadFiles } from "@holochain-open-dev/file-storage";
import { EntryHash, Record } from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  Card,
  Snackbar,
  MdFilledButton,
  MdOutlinedTextField,
  MdCheckbox,
} from "@scoped-elements/material-web";
import "@vaadin/date-time-picker/theme/material/vaadin-date-time-picker.js";
import { LitElement, html } from "lit";
import { state } from "lit/decorators.js";

import { gatherStoreContext } from "../context.js";
import { GatherStore } from "../gather-store.js";
import { Event } from "../types.js";

@localized()
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
  _private = false;

  @state()
  _cost: string | undefined;

  isEventValid() {
    return (
      this._title !== "" &&
      this._description !== "" &&
      this._image &&
      this._location &&
      this._startTime &&
      this._endTime &&
      this._private !== undefined
    );
  }

  @consume({ context: gatherStoreContext, subscribe: true })
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
      const record: Record = await this.gatherStore.client.createEvent(event);

      this.dispatchEvent(
        new CustomEvent("event-created", {
          composed: true,
          bubbles: true,
          detail: {
            eventHash: record.signed_action.hashed.hash,
          },
        })
      );
    } catch (e: any) {
      const errorSnackbar = this.shadowRoot?.getElementById(
        "create-error"
      ) as Snackbar;
      errorSnackbar.labelText = `${msg("Error creating the event")}: ${
        e.data.data
      }`;
      errorSnackbar.show();
    }
  }

  render() {
    return html`
      <mwc-snackbar id="create-error" leading> </mwc-snackbar>

      <mwc-card style="display: flex; flex: 1;">
        <div
          style="display: flex; flex: 1; flex-direction: column; margin: 16px"
        >
          <span style="font-size: 18px">${msg("Create Event")}</span>

          <span style="margin: 8px 0 ">${msg("Event Image")}</span>
          <upload-files
            style="margin-bottom: 16px; display: flex"
            one-file
            accepted-files="image/jpeg,image/png,image/gif"
            @file-uploaded=${(e: CustomEvent) => {
              this._image = e.detail.hash;
            }}
          ></upload-files>

          <md-outlined-text-field
            .label=${msg("Title")}
            style="margin-bottom: 16px"
            @input=${(e: CustomEvent) => {
              this._title = (e.target as any).value;
            }}
          ></md-outlined-text-field>
          <md-outlined-text-field
            outlined
            .label=${msg("Description")}
            style="margin-bottom: 16px"
            @input=${(e: CustomEvent) => {
              this._description = (e.target as any).value;
            }}
          ></md-outlined-text-field>

          <div style="display: flex; flex: 1; flex-direction: row">
            <div
              style="display: flex; flex: 1; flex-direction: column; margin-right: 16px;"
            >
              <md-outlined-text-field
                .label=${msg("Location")}
                style="margin-bottom: 16px"
                @input=${(e: CustomEvent) => {
                  this._location = (e.target as any).value;
                }}
              ></md-outlined-text-field>
              <vaadin-date-time-picker
                .label=${msg("Start Time")}
                style="margin-bottom: 16px"
                @change=${(e: CustomEvent) => {
                  this._startTime =
                    new Date((e.target as any).value).valueOf() * 1000;
                }}
              ></vaadin-date-time-picker>
              <vaadin-date-time-picker
                .label=${msg("End Time")}
                @change=${(e: CustomEvent) => {
                  this._endTime =
                    new Date((e.target as any).value).valueOf() * 1000;
                }}
              ></vaadin-date-time-picker>
            </div>

            <div class="column" style="flex: 1">
              <md-outlined-text-field
                .label=${msg("Cost")}
                @input=${(e: CustomEvent) => {
                  this._cost = (e.target as any).value;
                }}
              ></md-outlined-text-field>
              <label class="row center-content">
                <md-checkbox
                  @input=${(e: CustomEvent) => {
                    this._private = (e.target as any).checked;
                  }}
                ></md-checkbox>
                ${msg("Private Event")}
              </label>
            </div>
          </div>

          <md-filled-button
            style="margin-top: 16px;"
            .label=${msg("Create Event")}
            .disabled=${!this.isEventValid()}
            @click=${() => this.createEvent()}
          ></md-filled-button>
        </div>
      </mwc-card>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-snackbar": Snackbar,
      "md-filled-button": MdFilledButton,
      "mwc-card": Card,
      "md-outlined-text-field": MdOutlinedTextField,
      "upload-files": UploadFiles,
      "show-image": ShowImage,
      "vaadin-date-time-picker": customElements.get("vaadin-date-time-picker"),
      "md-checkbox": MdCheckbox,
    };
  }

  static styles = [sharedStyles];
}
