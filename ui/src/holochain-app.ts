import '@webcomponents/scoped-custom-element-registry';

import { CellClient, HolochainClient } from '@holochain-open-dev/cell-client';
import {
  FileStorageClient,
  fileStorageClientContext,
} from '@holochain-open-dev/file-storage';
import {
  AgentAvatar,
  Profile,
  ProfilePrompt,
  ProfilesService,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import {
  ActionHash,
  AppWebsocket,
  InstalledAppInfo,
  InstalledCell,
} from '@holochain/client';
import { contextProvider } from '@lit-labs/context';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  CircularProgress,
  Fab,
  Icon,
  IconButton,
  TopAppBar,
} from '@scoped-elements/material-web';
import { SlBreadcrumb, SlBreadcrumbItem } from '@scoped-elements/shoelace';
import { LitElement, css, html } from 'lit';
import { StoreSubscriber, TaskSubscriber } from 'lit-svelte-stores';
import { customElement, property, state } from 'lit/decorators.js';

import { gatherStoreContext } from './gather/gather/context';
import { AllEvents } from './gather/gather/elements/all-events';
import { AttendeesForEvent } from './gather/gather/elements/attendees-for-event';
import { CreateEvent } from './gather/gather/elements/create-event';
import { EventDetail } from './gather/gather/elements/event-detail';
import { GatherClient } from './gather/gather/gather-client';
import { GatherStore } from './gather/gather/gather-store';
import { sharedStyles } from './shared-styles';

type View =
  | { view: 'all_events' }
  | { view: 'event_detail'; selectedEventHash: ActionHash }
  | { view: 'create_event' };

export class HolochainApp extends ScopedElementsMixin(LitElement) {
  @contextProvider({ context: fileStorageClientContext })
  @property()
  _fileStorageClient!: FileStorageClient;

  @contextProvider({ context: gatherStoreContext })
  @property()
  _gatherStore!: GatherStore;

  @state() _loading = true;

  @state() _view: View = { view: 'all_events' };

  @contextProvider({ context: profilesStoreContext })
  @property()
  _profilesStore!: ProfilesStore;

  _myProfileTask!: TaskSubscriber<[], Profile | undefined>;

  async firstUpdated() {
    const url = `ws://localhost:${process.env.HC_PORT}`;

    const appWebsocket = await AppWebsocket.connect(url);
    const client = new HolochainClient(appWebsocket);

    const appInfo = await appWebsocket.appInfo({
      installed_app_id: 'gather',
    });

    const installedCells = appInfo.cell_data;
    const profilesCell = installedCells[0] as InstalledCell;

    const cellClient = new CellClient(client, profilesCell);

    await this.initStores(cellClient);

    this._loading = false;
  }

  async initStores(cellClient: CellClient) {
    this._profilesStore = new ProfilesStore(new ProfilesService(cellClient));
    this._gatherStore = new GatherStore(new GatherClient(cellClient));
    this._fileStorageClient = new FileStorageClient(cellClient);
  }

  renderMyProfile() {
    return this._myProfileTask?.render({
      pending: () => html``,
      complete: profile =>
        profile
          ? html` <div
              class="row"
              style="align-items: center;"
              slot="actionItems"
            >
              <agent-avatar
                .agentPubKey=${this._profilesStore.myAgentPubKey}
              ></agent-avatar>
              <span style="margin: 0 16px;">${profile?.nickname}</span>
            </div>`
          : undefined,
    });
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
      </div> `;
    if (this._view.view === 'create_event')
      return html`
      <div class="flex-scrollable-parent">
      <div class="flex-scrollable-container">
      <div class="flex-scrollable-y">
      <div class="column" style="flex: 1; align-items: center;">
      <create-event @event-created=${(e: CustomEvent) => {
          this._view = {
            view: 'event_detail',
            selectedEventHash: e.detail.eventHash,
          };
        }} style="margin-top: 16px"></event-detail>
      </div></div></div></div>`;

    return html`
      <div class="flex-scrollable-parent">
      <div class="flex-scrollable-container">
      <div class="flex-scrollable-y">
      <div class="column" style="flex: 1; align-items: center;">
        <div class="column" style="width: 800px;">
        <span class="title" style="margin: 16px 0;">All Events</span>
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

      <mwc-fab
        extended
        icon="add"
        label="Create Event"
        @click=${() => {
        this._view = { view: 'create_event' };
      }}
        style="position: absolute; right: 16px; bottom: 16px;"
      ></mwc-fab>`;
  }

  renderBackButton() {
    if (this._view.view === 'all_events') return html``;

    return html`
      <mwc-icon-button
        icon="arrow_back"
        slot="navigationIcon"
        @click=${() => {
        this._view = { view: 'all_events' };
      }}
      ></mwc-icon-button>
    `;
  }

  render() {
    if (this._loading)
      return html`<div
        class="row"
        style="flex: 1; height: 100%; align-items: center; justify-content: center;"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <mwc-top-app-bar style="flex: 1; display: flex;">
        ${this.renderBackButton()}
        <div slot="title">Gather</div>
        <div class="fill row" style="width: 100vw; height: 100%;">
          <profile-prompt
            style="flex: 1;"
            @profile-created=${() => this._myProfileTask.run()}
          >
            ${this.renderContent()}
          </profile-prompt>
        </div>
        ${this.renderMyProfile()}
      </mwc-top-app-bar>
    `;
  }

  static get scopedElements() {
    return {
      'agent-avatar': AgentAvatar,
      'profile-prompt': ProfilePrompt,
      'mwc-icon-button': IconButton,
      'mwc-top-app-bar': TopAppBar,
      'mwc-circular-progress': CircularProgress,
      'all-events': AllEvents,
      'create-event': CreateEvent,
      'mwc-icon': Icon,
      'event-detail': EventDetail,
      'mwc-fab': Fab,
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
