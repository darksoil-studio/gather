import { fileStorageClientContext, FileStorageClient } from '@holochain-open-dev/file-storage';

import '@webcomponents/scoped-custom-element-registry';

import { CellClient, HolochainClient } from '@holochain-open-dev/cell-client';
import {
  AgentAvatar,
  Profile,
  ProfilePrompt,
  ProfilesService,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import { serializeHash } from '@holochain-open-dev/utils';
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
  IconButton,
  TopAppBar,
} from '@scoped-elements/material-web';
import { LitElement, css, html } from 'lit';
import { StoreSubscriber, TaskSubscriber } from 'lit-svelte-stores';
import { customElement, property, state } from 'lit/decorators.js';

import { gatherStoreContext } from './gather/gather/context';
import { GatherClient } from './gather/gather/gather-client';
import { GatherStore } from './gather/gather/gather-store';
import { sharedStyles } from './shared-styles';
import { AllEvents} from './gather/gather/elements/all-events';
import { EventDetail} from './gather/gather/elements/event-detail';
import { CreateEvent } from './gather/gather/elements/create-event';

type View = {view:'all_events'} | {view: 'event_detail', selectedEventHash: ActionHash}|{view: 'create_event'};

export class HolochainApp extends ScopedElementsMixin(LitElement) {
  @contextProvider({ context: fileStorageClientContext })
  @property()
  _fileStorageClient!: FileStorageClient;

  @contextProvider({ context: gatherStoreContext })
  @property()
  _gatherStore!: GatherStore;

  @state() _loading = true;
  @state() _view: View = {view: 'all_events'};

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
    if (this._view.view === 'event_detail') return html`<event-detail .eventHash=${this._view.selectedEventHash}></event-detail>`;
    if (this._view.view === 'create_event') return html`<create-event @event-created=${(e: CustomEvent) => this._view ={view:'event_detail', selectedEventHash: e.detail.eventHash} }></event-detail>`;
    
    return html`<all-events @event-selected=${(e: CustomEvent) => this._view ={view:'event_detail', selectedEventHash: e.detail.eventHash} }></all-events>
      <mwc-fab extended icon="add" label="Create Event" @click=${()=> this._view = {view: 'create_event'}} style="position: absolute; right: 16px; bottom: 16px;"></mwc-fab>
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
      'mwc-fab': Fab
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
  ];}
