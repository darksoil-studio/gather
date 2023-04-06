import {
  assembleStoreContext,
  AssembleStore,
  AssembleClient,
} from '@darksoil/assemble';

import {
  FileStorageClient,
  fileStorageClientContext,
} from '@holochain-open-dev/file-storage';
import {
  Profile,
  ProfilesClient,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import '@holochain-open-dev/profiles/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/elements/profile-prompt.js';
import '@holochain-open-dev/profiles/elements/profile-list-item-skeleton.js';
import {
  ActionHash,
  AppAgentClient,
  AppAgentWebsocket,
} from '@holochain/client';
import { provide } from '@lit-labs/context';
import { LitElement, css, html } from 'lit';
import { AsyncStatus, StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';
import { mdiArrowLeft } from '@mdi/js';

import {
  GatherStore,
  GatherClient,
  gatherStoreContext,
} from '@darksoil/gather';
import '@darksoil/gather/elements/event-detail.js';
import '@darksoil/gather/elements/event-proposal-detail.js';
import '@darksoil/gather/elements/create-event.js';
import '@darksoil/gather/elements/create-event-proposal.js';
import '@darksoil/gather/elements/all-events.js';
import '@darksoil/gather/elements/events-calendar.js';
import '@darksoil/gather/elements/events-for-agent.js';
import { localized, msg } from '@lit/localize';
import { sharedStyles, wrapPathInSvg } from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';

type View =
  | { view: 'main' }
  | { view: 'event_detail'; selectedEventHash: ActionHash }
  | { view: 'event_proposal_detail'; selectedEventProposalHash: ActionHash }
  | { view: 'create_event' }
  | { view: 'create_event_proposal' };

@localized()
@customElement('holochain-app')
export class HolochainApp extends LitElement {
  @provide({ context: assembleStoreContext })
  @property()
  _assembleStore!: AssembleStore;

  @provide({ context: fileStorageClientContext })
  @property()
  _fileStorageClient!: FileStorageClient;

  @provide({ context: gatherStoreContext })
  @property()
  _gatherStore!: GatherStore;

  @state() _loading = true;

  @state() _view: View = { view: 'main' };

  @provide({ context: profilesStoreContext })
  @property()
  _profilesStore!: ProfilesStore;

  _myProfile!: StoreSubscriber<AsyncStatus<Profile | undefined>>;

  _client!: AppAgentClient;

  async firstUpdated() {
    this._client = await AppAgentWebsocket.connect('', 'gather');

    await this.initStores(this._client);

    this._loading = false;
  }

  async initStores(appAgentClient: AppAgentClient) {
    this._profilesStore = new ProfilesStore(
      new ProfilesClient(appAgentClient, 'gather')
    );
    this._myProfile = new StoreSubscriber(
      this,
      () => this._profilesStore.myProfile
    );
    this._gatherStore = new GatherStore(
      new GatherClient(appAgentClient, 'gather')
    );
    this._fileStorageClient = new FileStorageClient(appAgentClient, 'gather');
    this._assembleStore = new AssembleStore(
      new AssembleClient(appAgentClient, 'gather')
    );
  }

  renderMyProfile() {
    switch (this._myProfile.value.status) {
      case 'pending':
        return html`<profile-list-item-skeleton></profile-list-item-skeleton>`;
      case 'complete':
        const profile = this._myProfile.value.value;
        if (!profile) return html``;

        return html`<div
          class="row"
          style="align-items: center;"
          slot="actionItems"
        >
          <agent-avatar .agentPubKey=${this._client.myPubKey}></agent-avatar>
          <span style="margin: 0 16px;">${profile?.nickname}</span>
        </div>`;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching your profile')}
          .error=${this._myProfile.value.error.data.data}
          tooltip
        ></display-error>`;
    }
  }

  renderContent() {
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
    if (this._view.view === 'event_detail')
      return html`
        <event-detail .eventHash=${this._view.selectedEventHash}></event-detail>
      `;
    if (this._view.view === 'event_proposal_detail')
      return html`
        <event-proposal-detail
          .eventProposalHash=${this._view.selectedEventProposalHash}
        ></event-proposal-detail>
      `;

    return html`
      <sl-tab-group placement="start" style="display: flex; flex: 1; ">
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
                <div class="column">
                  <span class="title" style="margin: 16px 0;"
                    >${msg('All Events Proposals')}</span
                  >
                  <all-event-proposals style="flex: 1"> </all-event-proposals>
                </div>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="all_events">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column">
                  <span class="title" style="margin: 16px 0;"
                    >${msg('All Events')}</span
                  >
                  <all-events> </all-events>
                </div>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="my_events">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <div class="column">
                  <span class="title" style="margin: 16px 0;"
                    >${msg('My Events')}</span
                  >
                  <events-for-agent
                    .agent=${this._gatherStore.client.client.myPubKey}
                  ></events-for-agent>
                </div>
              </div>
            </div>
          </div>
        </sl-tab-panel>
        <sl-tab-panel name="calendar">
          <div class="flex-scrollable-parent">
            <div class="flex-scrollable-container">
              <div class="flex-scrollable-y">
                <span class="title" style="margin: 16px 0;"
                  >${msg('Events')}</span
                >
                <gather-events-calendar></gather-events-calendar>
              </div>
            </div>
          </div>
        </sl-tab-panel>
      </sl-tab-group>
    `;
  }

  renderBackButton() {
    if (this._view.view === 'main') return html``;

    return html`
      <sl-icon-button
        .src=${wrapPathInSvg(mdiArrowLeft)}
        @click=${() => {
          this._view = { view: 'main' };
        }}
        class="back-button"
        style="margin-right: 10px;"
        title=${msg('Back')}
      ></sl-icon-button>
    `;
  }

  render() {
    if (this._loading)
      return html`<div
        class="row"
        style="flex: 1; height: 100%; align-items: center; justify-content: center;"
      >
        <sl-spinner style="font-size: 2rem"></sl-spinner>
      </div>`;

    return html`
      <div class="column fill">
        <div
          class="row"
          style="align-items: center; color:white; background-color: var(--sl-color-primary-900); padding: 16px"
        >
          ${this.renderBackButton()}
          <span class="title" style="flex: 1">${msg('Radiance')}</span>

          ${this.renderMyProfile()}
        </div>

        <profile-prompt style="flex: 1;">
          ${this.renderContent()}
        </profile-prompt>
      </div>
    `;
  }

  static styles = [
    css`
      :host {
        display: flex;
        flex: 1;
      }
      sl-tab-group::part(base) {
        display: flex;
        flex: 1;
      }
      sl-tab-group::part(body) {
        display: flex;
        flex: 1;
      }
      sl-tab-panel::part(base) {
        width: 100%;
        height: 100%;
      }
      .flex-scrollable-parent {
        width: 100%;
        height: 100%;
      }
      sl-tab-panel {
        width: 100%;
      }
      .back-button {
        color: white;
        font-size: 22px;
      }
      .back-button:hover {
        background: #ffffff65;
        border-radius: 50%;
      }
    `,
    sharedStyles,
  ];
}
