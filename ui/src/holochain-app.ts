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
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/dist/elements/profile-prompt.js';
import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import {
  ActionHash,
  AppAgentClient,
  AppAgentWebsocket,
} from '@holochain/client';
import { provide } from '@lit-labs/context';
import { LitElement, css, html } from 'lit';
import { AsyncStatus, StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { classMap } from 'lit/directives/class-map.js';
import { mdiArrowLeft } from '@mdi/js';
import { decode } from '@msgpack/msgpack';

import { localized, msg } from '@lit/localize';
import { sharedStyles, wrapPathInSvg } from '@holochain-open-dev/elements';

import '@holochain-open-dev/elements/dist/elements/display-error.js';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import SlTabGroup from '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';

import './elements/event-detail.js';
import './elements/create-event.js';
import './elements/all-events.js';
import './elements/events-filter.js';
import './elements/events-calendar.js';
import './elements/my-events.js';
import { gatherStoreContext, isMobileContext } from './context.js';
import { GatherStore } from './gather-store.js';
import { GatherClient } from './gather-client.js';
import { ResizeController } from '@lit-labs/observers/resize-controller.js';
import { MOBILE_WIDTH_PX } from './utils.js';

export async function sendRequest(request: any) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();

    window.top!.postMessage(request, '*', [channel.port2]);

    channel.port1.onmessage = m => {
      if (m.data.type === 'success') {
        resolve(m.data.result);
      } else if (m.data.type === 'error') {
        reject(m.data.error);
      }
    };
  });
}

type View =
  | { view: 'main' }
  | { view: 'event_detail'; selectedEventHash: ActionHash }
  | { view: 'create_event' };

@localized()
@customElement('holochain-app')
export class HolochainApp extends LitElement {
  @provide({ context: fileStorageClientContext })
  @property()
  _fileStorageClient!: FileStorageClient;

  @provide({ context: gatherStoreContext })
  @property()
  _gatherStore!: GatherStore;

  @provide({ context: assembleStoreContext })
  @property()
  _assembleStore!: AssembleStore;

  @state() _loading = true;

  @state() _view: View = { view: 'main' };

  @provide({ context: profilesStoreContext })
  @property()
  _profilesStore!: ProfilesStore;

  @provide({ context: isMobileContext })
  @property()
  _isMobile: boolean = false;

  _myProfile!: StoreSubscriber<AsyncStatus<Profile | undefined>>;

  _client!: AppAgentClient;

  async firstUpdated() {
    new ResizeController(this, {
      callback: () => {
        this._isMobile = this.getBoundingClientRect().width < MOBILE_WIDTH_PX;
      },
    });
    try {
      const envresponse = await fetch('/__HC_ENVIRONMENT__.json');

      const env = await envresponse.json();
      const port = env.APP_INTERFACE_PORT;
      this._client = await AppAgentWebsocket.connect(
        new URL(`ws://localhost:${port}`),
        env.INSTALLED_APP_ID,
        60000
      );

      const appWs = (this._client as AppAgentWebsocket).appWebsocket;
      appWs.callZome = appWs._requester('call_zome', {
        input: async request => {
          if ('signature' in request) {
            return request;
          }

          return sendRequest({
            type: 'sign-zome-call',
            zomeCall: request,
          });
        },
        output: response => decode(response as any),
      });
    } catch (e) {
      // console.log('we are in the normal launcher env');
      this._client = await AppAgentWebsocket.connect(
        new URL(`ws://localhost`),
        'gather',
        60000
      );
    }

    await this.initStores(this._client);

    // let finished = false;

    // while (!finished) {
    //   try {
    //     await this._profilesStore.client.getAgentProfile(this._client.myPubKey);
    //     finished = true;
    //   } catch (e) {
    //     console.warn(e);
    //     await new Promise(r => setTimeout(() => r(undefined), 500));
    //   }
    // }

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
    this._assembleStore = new AssembleStore(
      new AssembleClient(appAgentClient, 'gather')
    );
    this._gatherStore = new GatherStore(
      new GatherClient(appAgentClient, 'gather'),
      this._assembleStore
    );
    this._fileStorageClient = new FileStorageClient(appAgentClient, 'gather');
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
          .error=${this._myProfile.value.error}
          tooltip
        ></display-error>`;
    }
  }

  renderCreateEvent() {
    return html` <div class="flex-scrollable-parent">
      <div class="flex-scrollable-container">
        <div class="flex-scrollable-y">
          <div class="column" style="flex: 1; align-items: center;">
            <create-event
              @event-created=${async (e: CustomEvent) => {
                this._view = {
                  view: 'main',
                };

                setTimeout(() => {
                  const panel = e.detail.isProposal
                    ? 'all_event_proposals'
                    : 'all_events';
                  (this.shadowRoot?.getElementById('tabs') as SlTabGroup).show(
                    panel
                  );
                }, 10);
              }}
              style="max-width: 600px"
            ></create-event>
          </div>
        </div>
      </div>
    </div>`;
  }

  renderEventDetail(eventHash: ActionHash) {
    if (this._isMobile)
      return html`
        <event-detail style="flex: 1" .eventHash=${eventHash}></event-detail>
      `;

    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div class="column" style="flex: 1; align-items: center;">
              <event-detail
                style="margin: 16px"
                .eventHash=${eventHash}
              ></event-detail>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCreateEventButton() {
    return html`
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
    `;
  }

  renderContent() {
    return html`
      ${this._view.view === 'create_event' ? this.renderCreateEvent() : html``}
      ${this._view.view === 'event_detail'
        ? this.renderEventDetail(this._view.selectedEventHash)
        : html``}
      <sl-tab-group
        id="tabs"
        .placement=${this._isMobile ? 'bottom' : 'start'}
        style=${styleMap({
          display: this._view.view === 'main' ? 'flex' : 'none',
          flex: '1',
        })}
        @event-selected=${(e: CustomEvent) => {
          this._view = {
            view: 'event_detail',
            selectedEventHash: e.detail.eventHash,
          };
        }}
      >
        ${this._isMobile ? html`` : this.renderCreateEventButton()}
        <sl-tab slot="nav" panel="all_events">${msg('All Events')}</sl-tab>
        <sl-tab slot="nav" panel="my_events">${msg('My Events')}</sl-tab>
        <sl-tab slot="nav" panel="calendar">${msg('Calendar')}</sl-tab>

        <sl-tab-panel name="all_events" style="position: relative">
          ${this._isMobile
            ? html`
                <div style="position: absolute; bottom: 16px; right: 16px">
                  ${this.renderCreateEventButton()}
                </div>
              `
            : html``}
          <all-events class="tab-content"> </all-events>
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
      <div
        class=${classMap({
          column: true,
          fill: true,
          mobile: !!this._isMobile,
          desktop: !this._isMobile,
        })}
        style="position: relative"
      >
        <div
          class="row"
          style="align-items: center; color:white; background-color: var(--sl-color-primary-900); padding: 0 16px; height: 65px;"
        >
          ${this.renderBackButton()}
          <span class="title" style="flex: 1">${msg('Gather')}</span>

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
      .desktop sl-tab-group::part(active-tab-indicator) {
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
        --padding: 0;
      }
      .back-button {
        color: white;
        font-size: 22px;
      }
      .back-button:hover {
        background: #ffffff65;
        border-radius: 50%;
      }
      .tab-content {
        width: 100%;
        height: 100%;
      }

      .mobile sl-tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .desktop create-event {
        margin-top: 16px;
      }
    `,
    sharedStyles,
  ];
}
