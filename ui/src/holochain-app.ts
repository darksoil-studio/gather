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
import '@holochain-open-dev/profiles/dist/elements/profile-detail.js';
import '@holochain-open-dev/profiles/dist/elements/update-profile.js';
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
import {
  mdiAlertCircleOutline,
  mdiArrowLeft,
  mdiCalendar,
  mdiCalendarAccount,
  mdiCalendarPlus,
} from '@mdi/js';
import { decode } from '@msgpack/msgpack';

import { configureLocalization, localized, msg } from '@lit/localize';
import { sharedStyles, wrapPathInSvg } from '@holochain-open-dev/elements';

import '@holochain-open-dev/elements/dist/elements/display-error.js';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';

import './gather/gather/elements/event-detail.js';
import './gather/gather/elements/proposal-detail.js';
import './gather/gather/elements/create-event.js';
import './gather/gather/elements/all-events.js';
import './gather/gather/elements/events-filter.js';
import './gather/gather/elements/events-calendar.js';
import './gather/gather/elements/my-events.js';
import './gather/gather/elements/my-alerts.js';
import {
  gatherStoreContext,
  isMobileContext,
} from './gather/gather/context.js';
import { GatherStore } from './gather/gather/gather-store.js';
import { GatherClient } from './gather/gather/gather-client.js';
import { ResizeController } from '@lit-labs/observers/resize-controller.js';
import { MOBILE_WIDTH_PX } from './gather/gather/utils.js';
import { AlertsClient } from './alerts/alerts-client.js';
import { AlertsStore } from './alerts/alerts-store.js';
import {
  CancellationsClient,
  CancellationsStore,
  cancellationsStoreContext,
} from '@holochain-open-dev/cancellations';
import { setLocale } from './locales.js';

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
  | { view: 'proposal_detail'; selectedProposalHash: ActionHash }
  | { view: 'profile_detail' }
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

  @state()
  _loading = true;

  @state()
  _view: View = { view: 'main' };

  @provide({ context: profilesStoreContext })
  @property()
  _profilesStore!: ProfilesStore;

  @provide({ context: cancellationsStoreContext })
  @property()
  _cancellationsStore!: CancellationsStore;

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
      await setLocale();

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
      await setLocale();
      // console.log('we are in the normal launcher env');
      this._client = await AppAgentWebsocket.connect(
        new URL(`ws://localhost`),
        'gather',
        60000
      );
    }
    // installLogger(this._client as any);

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
    this._cancellationsStore = new CancellationsStore(
      new CancellationsClient(appAgentClient, 'gather', 'cancellations')
    );
    this._assembleStore = new AssembleStore(
      new AssembleClient(appAgentClient, 'gather'),
      this._cancellationsStore
    );
    this._gatherStore = new GatherStore(
      new GatherClient(appAgentClient, 'gather'),
      this._assembleStore,
      new AlertsStore(new AlertsClient(appAgentClient, 'gather')),
      this._cancellationsStore
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
          @click=${() => {
            this._view = {
              view: 'profile_detail',
            };
          }}
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
                  view: 'event_detail',
                  selectedEventHash: e.detail.eventHash,
                };
              }}
              @proposal-created=${async (e: CustomEvent) => {
                this._view = {
                  view: 'proposal_detail',
                  selectedProposalHash: e.detail.proposalHash,
                };
              }}
              style=${styleMap({
                width: this._isMobile ? '100%' : '600px',
              })}
            ></create-event>
          </div>
        </div>
      </div>
    </div>`;
  }

  @state()
  editingProfile = false;

  renderProfileDetail() {
    if (this.editingProfile)
      return html`
        <div class="column" style="flex: 1; align-items: center;">
          <sl-card
            style=${styleMap({
              width: this._isMobile ? '100%' : '400px',
              'margin-top': this._isMobile ? '0' : '16px',
            })}
          >
            <span slot="header" class="title">${msg('Update Profile')}</span>
            <update-profile
              style="flex: 1"
              @profile-updated=${() => {
                this.editingProfile = false;
              }}
              @cancel-edit-profile=${() => {
                this.editingProfile = false;
              }}
            ></update-profile>
          </sl-card>
        </div>
      `;
    return html`
      <div class="column" style="flex: 1; align-items: center;">
        <sl-card
          style=${styleMap({
            width: this._isMobile ? '100%' : '400px',
            'margin-top': this._isMobile ? '0' : '16px',
          })}
        >
          <span slot="header" class="title">${msg('Your Profile')}</span>
          <div class="column" style="flex: 1; gap: 16px">
            <profile-detail
              style="flex: 1"
              .agentPubKey=${this._gatherStore.client.client.myPubKey}
            ></profile-detail>

            <sl-button
              @click=${() => {
                this.editingProfile = true;
              }}
              >${msg('Edit Profile')}</sl-button
            >
          </div>
        </sl-card>
      </div>
    `;
  }

  renderEventDetail(eventHash: ActionHash) {
    return html`
      <event-detail style="flex: 1" .eventHash=${eventHash}></event-detail>
    `;

    // return html`
    //   <div class="flex-scrollable-parent">
    //     <div class="flex-scrollable-container">
    //       <div class="flex-scrollable-y">
    //         <div class="column" style="flex: 1; align-items: center;">
    //           <event-detail
    //             style="margin: 16px; min-width: 600px; max-width: 100%"
    //             .eventHash=${eventHash}
    //           ></event-detail>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // `;
  }

  renderProposalDetail(proposalHash: ActionHash) {
    // if (this._isMobile)
    return html`
      <proposal-detail
        style="flex: 1"
        .proposalHash=${proposalHash}
      ></proposal-detail>
    `;

    // return html`
    //   <div class="flex-scrollable-parent">
    //     <div class="flex-scrollable-container">
    //       <div class="flex-scrollable-y">
    //         <div class="column" style="flex: 1; align-items: center;">
    //           <proposal-detail
    //             style="margin: 16px; min-width: 600px; max-width: 100%"
    //             .proposalHash=${proposalHash}
    //           ></proposal-detail>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // `;
  }

  renderCreateEventButton() {
    return html`
      <sl-button
        variant="primary"
        pill
        @click=${() => {
          this._view = { view: 'create_event' };
        }}
        style="z-index: 1000"
      >
        <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiCalendarPlus)}></sl-icon>
        ${msg('Create Event')}
      </sl-button>
    `;
  }

  renderMain() {
    return html`
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
        @proposal-selected=${(e: CustomEvent) => {
          this._view = {
            view: 'proposal_detail',
            selectedProposalHash: e.detail.proposalHash,
          };
        }}
      >
        ${this._isMobile
          ? html``
          : html` <div slot="nav" style="margin: 8px; margin-top: 8px; ">
              ${this.renderCreateEventButton()}
            </div>`}
        <sl-tab slot="nav" panel="all_events"
          ><div
            class=${classMap({
              row: !this._isMobile,
              column: this._isMobile,
            })}
            style="gap: 8px; align-items: center"
          >
            <sl-icon .src=${wrapPathInSvg(mdiCalendar)}></sl-icon>
            <span>${msg('All Events')}</span>
          </div>
        </sl-tab>
        <sl-tab slot="nav" panel="my_events">
          <div
            class=${classMap({
              row: !this._isMobile,
              column: this._isMobile,
            })}
            style="gap: 8px; align-items: center"
          >
            <sl-icon .src=${wrapPathInSvg(mdiCalendarAccount)}></sl-icon
            ><span> ${msg('My Events')}</span>
          </div></sl-tab
        >
        <sl-tab slot="nav" panel="alerts">
          <div
            class=${classMap({
              row: !this._isMobile,
              column: this._isMobile,
            })}
            style="gap: 8px; align-items: center"
          >
            <sl-icon .src=${wrapPathInSvg(mdiAlertCircleOutline)}></sl-icon
            ><span> ${msg('Alerts')}</span>
          </div></sl-tab
        >

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
        <sl-tab-panel name="my_events" style="position: relative">
          ${this._isMobile
            ? html`
                <div style="position: absolute; bottom: 16px; right: 16px">
                  ${this.renderCreateEventButton()}
                </div>
              `
            : html``}
          <my-events class="tab-content"> </my-events>
        </sl-tab-panel>
        <sl-tab-panel name="alerts">
          <my-alerts class="tab-content"></my-alerts>
        </sl-tab-panel>
      </sl-tab-group>
    `;
  }

  renderContent() {
    let detail = html``;
    if (this._view.view === 'proposal_detail') {
      detail = this.renderProposalDetail(this._view.selectedProposalHash);
    } else if (this._view.view === 'event_detail') {
      detail = this.renderEventDetail(this._view.selectedEventHash);
    } else if (this._view.view === 'create_event') {
      detail = this.renderCreateEvent();
    } else if (this._view.view === 'profile_detail') {
      detail = this.renderProfileDetail();
    }

    return html` ${detail} ${this.renderMain()} `;
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
      sl-tab-panel {
        width: 100%;
        --padding: 0;
      }
      sl-card::part(base) {
        flex: 1;
      }
      .flex-scrollable-parent {
        width: 100%;
        height: 100%;
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
        background-color: white;
      }
      .desktop create-event {
        margin-top: 16px;
      }
      sl-tab sl-icon {
        font-size: 24px;
      }
    `,
    sharedStyles,
  ];
}
