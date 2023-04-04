import { assembleStoreContext, AssembleStore, AssembleClient } from 'lib';

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

import {
  GatherStore,
  GatherClient,
  gatherStoreContext,
} from '@darksoil/gather';
import '@darksoil/gather/elements/event-detail.js';
import '@darksoil/gather/elements/create-event.js';
import '@darksoil/gather/elements/all-events.js';
import { localized, msg } from '@lit/localize';
import { sharedStyles } from '@holochain-open-dev/elements';
import '@holochain-open-dev/elements/elements/display-error.js';

type View =
  | { view: 'all_events' }
  | { view: 'event_detail'; selectedEventHash: ActionHash }
  | { view: 'create_event' };

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

  @state() _view: View = { view: 'all_events' };

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
    this._assembleStore = new AssembleStore(new AssembleClient(appAgentClient, 'gather'));
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
    if (this._view.view === 'event_detail')
      return html`
        <div class="flex-scrollable-parent">
          <div class="flex-scrollable-container">
            <div class="flex-scrollable-y">
              <div class="column" style="flex: 1; align-items: center;">
                <event-detail
                  style="flex: 1; margin-right: 16px"
                  .eventHash=${this._view.selectedEventHash}
                  @event-deleted=${() => {
                    this._view = { view: 'all_events' };
                  }}
                ></event-detail>
              </div>
            </div>
          </div>
        </div>
      `;
    if (this._view.view === 'create_event')
      return html` <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column" style="flex: 1; align-items: center;">
              <create-event
                @event-created=${(e: CustomEvent) => {
                  this._view = {
                    view: 'event_detail',
                    selectedEventHash: e.detail.eventHash,
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
                <all-events
                  @event-selected=${(e: CustomEvent) => {
                    this._view = {
                      view: 'event_detail',
                      selectedEventHash: e.detail.eventHash,
                    };
                  }}
                  style="flex: 1"
                >
                </all-events>
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

  renderBackButton() {
    if (this._view.view === 'all_events') return html``;

    return html`
      <sl-icon-button
        name="arrow-left"
        @click=${() => {
          this._view = { view: 'all_events' };
        }}
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
    `,
    sharedStyles,
  ];}
