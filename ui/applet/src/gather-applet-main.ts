import { provide } from '@lit-labs/context';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { MdFabExtended } from '@scoped-elements/material-web';
import { LitElement, css, html } from 'lit';
import { property, state } from 'lit/decorators.js';

import {
  GatherStore,
  CreateEvent,
  AllEvents,
  gatherStoreContext,
} from '@darksoil/gather';
import { localized, msg } from '@lit/localize';
import { sharedStyles } from '@holochain-open-dev/elements';

type View = { view: 'all_events' } | { view: 'create_event' };

@localized()
export class GatherAppletMain extends ScopedElementsMixin(LitElement) {
  @provide({ context: gatherStoreContext })
  @property()
  _gatherStore!: GatherStore;

  @state() _loading = true;

  @state() _view: View = { view: 'all_events' };

  render() {
    if (this._view.view === 'create_event')
      return html` <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column" style="flex: 1; align-items: center;">
              <create-event
                @event-created=${(e: CustomEvent) => {
                  // this._view = {
                  //   view: "event_detail",
                  //   selectedEventHash: e.detail.eventHash,
                  // };
                }}
                style="margin-top: 16px"
              ></create-event>
            </div>
          </div>
        </div>
      </div>`;

    return html` <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column" style="flex: 1; align-items: center;">
              <div class="column" style="width: 800px;">
                <span class="title" style="margin: 16px 0;"
                  >${msg('All Events')}</span
                >
                <all-events
                  @event-selected=${(e: CustomEvent) => {
                    // this._view = {
                    //   view: "event_detail",
                    //   selectedEventHash: e.detail.eventHash,
                    // };
                  }}
                  style="flex: 1"
                >
                </all-events>
              </div>
            </div>
          </div>
        </div>
      </div>

      <md-fab-extended
        icon="add"
        .label=${msg('Create Event')}
        @click=${() => {
          this._view = { view: 'create_event' };
        }}
        style="position: absolute; right: 16px; bottom: 16px;"
      ></md-fab-extended>`;
  }

  static get scopedElements() {
    return {
      'all-events': AllEvents,
      'create-event': CreateEvent,
      'md-fab-extended': MdFabExtended,
    };
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
    sharedStyles,
  ];
}
