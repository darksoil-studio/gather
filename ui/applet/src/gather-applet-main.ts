import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';

import '@darksoil/gather/elements/create-event.js';
import '@darksoil/gather/elements/create-event-proposal.js';
import '@darksoil/gather/elements/all-events.js';
import '@darksoil/gather/elements/all-events-proposals.js';
import '@darksoil/gather/elements/events-calendar.js';
import '@darksoil/gather/elements/events-for-agent.js';
import { localized, msg } from '@lit/localize';
import { sharedStyles } from '@holochain-open-dev/elements';
import { GatherStore, gatherStoreContext } from '@darksoil/gather';
import { consume } from '@lit-labs/context';

type View =
  | { view: 'main' }
  | { view: 'create_event' }
  | { view: 'create_event_proposal' };

@localized()
@customElement('gather-applet-main')
export class GatherAppletMain extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state() _loading = true;

  @state() _view: View = { view: 'main' };

  render() {
    if (this._view.view === 'create_event')
      return html` <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column" style="flex: 1; align-items: center;">
              <sl-button
                @click=${() => (this._view = { view: 'main' })}
                style="position: absolute; left: 16px; top: 16px;"
                >${msg('Back')}</sl-button
              >
              <create-event
                @event-created=${(e: CustomEvent) => {
                  this._view = {
                    view: 'main',
                  };
                }}
                style="margin-top: 16px"
              ></create-event>
            </div>
          </div>
        </div>
      </div>`;
    if (this._view.view === 'create_event_proposal')
      return html` <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column" style="flex: 1; align-items: center;">
              <sl-button
                @click=${() => (this._view = { view: 'main' })}
                style="position: absolute; left: 16px; top: 16px;"
                >${msg('Back')}</sl-button
              >
              <create-event-proposal
                @call-to-action-created=${(e: CustomEvent) => {
                  this._view = {
                    view: 'main',
                  };
                }}
                style="margin-top: 16px"
              ></create-event-proposal>
            </div>
          </div>
        </div>
      </div>`;

    return html`
      <sl-tab-group placement="start" style="display: flex; flex: 1; ">
        <sl-button
          variant="primary"
          slot="nav"
          @click=${() => {
            this._view = { view: 'create_event_proposal' };
          }}
          style="margin: 8px"
        >
          ${msg('Create Event Proposal')}
        </sl-button>
        <sl-button
          variant="primary"
          @click=${() => {
            this._view = { view: 'create_event' };
          }}
          slot="nav"
          style="margin: 8px; margin-top: 0"
        >
          ${msg('Create Event')}
        </sl-button>
        <sl-tab slot="nav" panel="all_event_proposals"
          >${msg('Event Proposals')}</sl-tab
        >
        <sl-tab slot="nav" panel="all_events">${msg('All Events')}</sl-tab>
        <sl-tab slot="nav" panel="my_events">${msg('My Events')}</sl-tab>
        <sl-tab slot="nav" panel="calendar">${msg('Calendar')}</sl-tab>

        <sl-tab-panel name="all_event_proposals">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column" style="align-items: center">
                  <all-events-proposals style="max-width: 900px; margin: 16px">
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
                  <all-events style="max-width: 900px; margin: 16px">
                  </all-events>
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
                  <events-for-agent
                    style="max-width: 900px; margin: 16px"
                    .agent=${this.gatherStore.client.client.myPubKey}
                  ></events-for-agent>
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
        margin-top: 102px;
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
    `,
    sharedStyles,
  ];
}
