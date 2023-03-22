import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '@shoelace-style/shoelace/dist/components/button/button.js';

import '@darksoil/gather/elements/create-event.js';
import '@darksoil/gather/elements/all-events.js';
import { localized, msg } from '@lit/localize';
import { sharedStyles } from '@holochain-open-dev/elements';

type View = { view: 'all_events' } | { view: 'create_event' };

@localized()
@customElement('gather-applet-main')
export class GatherAppletMain extends LitElement {
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
                  this._view = {
                    view: 'all_events',
                  };
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
                <all-events style="flex: 1"> </all-events>
              </div>
            </div>
          </div>
        </div>
      </div>

      <sl-button
        variant="primary"
        @click=${() => {
          this._view = { view: 'create_event' };
        }}
        style="position: absolute; right: 16px; bottom: 16px;"
      >
        ${msg('Create Event')}
      </sl-button>`;
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
