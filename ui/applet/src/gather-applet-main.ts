import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';

import '@darksoil/gather/elements/create-event.js';
import '@darksoil/assemble/elements/create-call-to-action.js';
import '@darksoil/gather/elements/create-event-proposal.js';
import '@darksoil/gather/elements/all-events.js';
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
      <sl-tab-group placement="start" style="display: flex; flex: 1;">
        <sl-button
          variant="primary"
          @click=${() => {
            this._view = { view: 'create_event' };
          }}
          slot="nav"
          style="margin-bottom: 16px;"
        >
          ${msg('Create Event')}
        </sl-button>
        <sl-button
          variant="primary"
          slot="nav"
          @click=${() => {
            this._view = { view: 'create_event_proposal' };
          }}
        >
          ${msg('Create Event Proposal')}
        </sl-button>
        <sl-tab slot="nav" panel="all_event_proposals"
          >${msg('All Event Proposals')}</sl-tab
        >
        <sl-tab slot="nav" panel="all_events">${msg('All Events')}</sl-tab>
        <sl-tab slot="nav" panel="my_events">${msg('My Events')}</sl-tab>
        <sl-tab slot="nav" panel="calendar">${msg('Calendar')}</sl-tab>

        <sl-tab-panel name="all_event_proposals">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <span class="title" style="margin: 16px 0;"
                  >${msg('All Events Proposals')}</span
                >
                <all-event-proposals style="flex: 1"> </all-event-proposals>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="all_events">
          <div class="column" style="flex: 1">
            <span class="title" style="margin: 16px 0;"
              >${msg('All Events')}</span
            >
            <all-event-proposals style="flex: 1"> </all-event-proposals>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="my_events">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column" style="flex: 1; align-items: center;">
                  <div class="column" style="width: 700px;">
                    <span class="title" style="margin: 16px 0;"
                      >${msg('My Events')}</span
                    >
                    <events-for-agent
                      .agentPubKey=${this.gatherStore.client.client.myPubKey}
                    ></events-for-agent>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    `,
    sharedStyles,
  ];
}
