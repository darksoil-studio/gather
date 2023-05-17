import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';

import '@darksoil/gather/dist/elements/create-event.js';
import '@darksoil/gather/dist/elements/all-events.js';
import '@darksoil/gather/dist/elements/all-events-proposals.js';
import '@darksoil/gather/dist/elements/events-calendar.js';
import '@darksoil/gather/dist/elements/my-events.js';
import '@darksoil/gather/dist/elements/my-events-proposals.js';

import { localized, msg } from '@lit/localize';
import { sharedStyles } from '@holochain-open-dev/elements';
import SlTabGroup from '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';

type View = { view: 'main' } | { view: 'create_event' };

@localized()
@customElement('gather-applet-main')
export class GatherAppletMain extends LitElement {
  @state() _view: View = { view: 'main' };

  renderCreateEvent() {
    return html` <div class="flex-scrollable-parent">
      <div class="flex-scrollable-container">
        <div class="flex-scrollable-y">
          <sl-button
            @click=${() => {
              this._view = { view: 'main' };
            }}
            style="position: absolute; left: 16px; top: 16px;"
            >${msg('Back')}</sl-button
          >
          <div class="column" style="flex: 1; align-items: center;">
            <create-event
              @event-created=${async (e: CustomEvent) => {
                this._view = {
                  view: 'main',
                };

                setTimeout(() => {
                  const panel = e.detail.isProposal
                    ? 'all_events_proposals'
                    : 'all_events';
                  (this.shadowRoot?.getElementById('tabs') as SlTabGroup).show(
                    panel
                  );
                }, 10);
              }}
              style="margin-top: 16px; max-width: 600px"
            ></create-event>
          </div>
        </div>
      </div>
    </div>`;
  }

  render() {
    return html`
      ${this._view.view === 'create_event' ? this.renderCreateEvent() : html``}
      <sl-tab-group
        id="tabs"
        placement="start"
        style=${styleMap({
          display: this._view.view === 'main' ? 'flex' : 'none',
          flex: '1',
        })}
      >
        <sl-button
          variant="primary"
          @click=${() => {
            this._view = { view: 'create_event' };
          }}
          slot="nav"
          style="margin: 8px; margin-top: 8px"
        >
          ${msg('Create Event')}
        </sl-button>
        <sl-tab slot="nav" panel="all_event_proposals"
          >${msg('All Event Proposals')}</sl-tab
        >
        <sl-tab slot="nav" panel="all_events">${msg('All Events')}</sl-tab>
        <sl-tab slot="nav" panel="my_events_proposals"
          >${msg('My Events Proposals')}</sl-tab
        >
        <sl-tab slot="nav" panel="my_events">${msg('My Events')}</sl-tab>
        <sl-tab slot="nav" panel="calendar">${msg('Calendar')}</sl-tab>

        <sl-tab-panel name="all_event_proposals">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column" style="align-items: center">
                  <all-events-proposals
                    style="margin: 16px"
                    class="tab-content"
                  >
                  </all-events-proposals>
                </div>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="all_events">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column" style="align-items: center">
                  <all-events style="margin: 16px" class="tab-content">
                  </all-events>
                </div>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="my_events_proposals">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column" style="align-items: center">
                  <my-events-proposals
                    class="tab-content"
                    style="margin: 16px"
                  ></my-events-proposals>
                </div>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="my_events">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column" style="align-items: center">
                  <my-events
                    class="tab-content"
                    style="900px; margin: 16px"
                  ></my-events>
                </div>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="calendar">
          <sl-card style="flex: 1" class="row">
            <gather-events-calendar style="flex: 1"></gather-events-calendar
          ></sl-card>
        </sl-tab-panel>
      </sl-tab-group>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
      :host {
        display: flex;
        flex: 1;
      }
      sl-tab-group::part(base) {
        display: flex;
        flex: 1;
      }
      sl-tab-group::part(active-tab-indicator) {
        margin-top: 52px;
      }
      sl-tab-group::part(body) {
        display: flex;
        flex: 1;
      }
      sl-tab-panel::part(base) {
        width: 100%;
        height: 100%;
      }
      sl-card::part(base) {
        flex: 1;
      }
      .flex-scrollable-parent {
        width: 100%;
        height: 100%;
      }
      sl-tab-panel {
        width: 100%;
      }
      .tab-content {
        max-width: 900px;
        min-width: 700px;
      }
    `,
    sharedStyles,
  ];
}
