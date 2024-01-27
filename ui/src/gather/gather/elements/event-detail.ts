import {
  hashProperty,
  notifyError,
  renderAsyncStatus,
  withSpinnerAndDisplayError,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import {
  joinAsync,
  pipe,
  sliceAndJoin,
  StoreSubscriber,
  subscribe,
} from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import {
  mdiAccountGroup,
  mdiAccountPlus,
  mdiCalendar,
  mdiCalendarClock,
  mdiCancel,
  mdiCash,
  mdiFormatListChecks,
  mdiMapMarker,
  mdiPencil,
  mdiTimeline,
} from '@mdi/js';
import { SlDrawer } from '@shoelace-style/shoelace';
import { styleMap } from 'lit/directives/style-map.js';

import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/relative-time/relative-time.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/cancellations/dist/elements/cancellations-for.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';

import { CreateCancellationDialog } from '@holochain-open-dev/cancellations/dist/elements/create-cancellation-dialog.js';

import '@darksoil/assemble/dist/elements/call-to-action-unsatisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-satisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-need-progress.js';
import '@darksoil/assemble/dist/elements/my-commitments-for-call-to-action.js';
import { CallToAction } from '@darksoil/assemble';

import './participants-for-event.js';
import './interested-button.js';
import './participate-dialog.js';
import './event-activity.js';
import './edit-event.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { EventWithStatus } from '../types.js';
import { ParticipateDialog } from './participate-dialog.js';
import { styles } from '../../../styles.js';

@localized()
@customElement('event-detail')
export class EventDetail extends LitElement {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  /**
   * @internal
   */
  _event = new StoreSubscriber(
    this,
    () =>
      joinAsync([
        this.gatherStore.events.get(this.eventHash).status,
        this.gatherStore.events.get(this.eventHash).participants,
        pipe(
          this.gatherStore.events.get(this.eventHash).latestVersion,
          event =>
            this.gatherStore.assembleStore.callToActions.get(
              event.entry.call_to_action_hash
            ).latestVersion
        ),
      ]),
    () => [this.eventHash]
  );

  /**
   * @internal
   */
  @state()
  _editing = false;

  /**
   * @internal
   */
  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  @state()
  committing = false;

  async commitToParticipate(event: EventWithStatus) {
    if (this.committing) return;

    this.committing = true;

    try {
      await this.gatherStore.assembleStore.client.createCommitment({
        amount: 1,
        call_to_action_hash: event.currentEvent.entry.call_to_action_hash,
        comment: '',
        need_index: 0,
      });

      this.dispatchEvent(
        new CustomEvent('participant-added', {
          bubbles: true,
          composed: true,
          detail: {
            eventHash: this.eventHash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error adding participant.'));
      console.error(e);
    }
    this.committing = false;
  }

  renderStatus(event: EventWithStatus) {
    const eventStatus = event.status;
    if (eventStatus === 'cancelled_event')
      return html`<sl-tag variant="warning">${msg('Cancelled')}</sl-tag>`;
    if (eventStatus === 'upcoming_event')
      return html`<sl-tag variant="success">${msg('Upcoming Event')}</sl-tag>`;
    return html`<sl-tag variant="success">${msg('Past Event')}</sl-tag>`;
  }

  renderActions(event: EventWithStatus) {
    return html`${subscribe(
      joinAsync([
        this.gatherStore.events.get(this.eventHash).participants,
        pipe(
          this.gatherStore.events.get(this.eventHash).callToAction,
          c => c.latestVersion
        ),
      ]),
      renderAsyncStatus({
        complete: ([participantsMap, callToAction]) => {
          const participants = Array.from(participantsMap.keys());
          const myPubKeyStr =
            this.gatherStore.client.client.myPubKey.toString();
          const iAmHost = !!event.currentEvent.entry.hosts.find(
            h => h.toString() === myPubKeyStr
          );
          const iAmParticipant = participants.find(
            i => i.toString() === myPubKeyStr
          );
          const eventStatus = event.status;

          const buttons = !this._isMobile
            ? [
                html`
                  <sl-button
                    variant="default"
                    pill
                    @click=${() => {
                      (
                        this.shadowRoot?.querySelector('sl-drawer') as SlDrawer
                      ).show();
                    }}
                  >
                    <sl-icon .src=${wrapPathInSvg(mdiTimeline)}></sl-icon>
                    ${msg('See Activity')}
                  </sl-button>
                `,
              ]
            : [];

          if (eventStatus === 'upcoming_event') {
            if (iAmHost) {
              buttons.push(html`
                <sl-button
                  variant="default"
                  pill
                  @click=${() => {
                    this._editing = true;
                  }}
                >
                  <sl-icon
                    slot="prefix"
                    .src=${wrapPathInSvg(mdiPencil)}
                  ></sl-icon>
                  ${msg('Edit event')}
                </sl-button>

                <sl-button
                  pill
                  variant="danger"
                  @click=${() => {
                    (
                      this.shadowRoot?.getElementById(
                        'cancel-event'
                      ) as CreateCancellationDialog
                    ).show();
                  }}
                >
                  <sl-icon
                    slot="prefix"
                    .src=${wrapPathInSvg(mdiCancel)}
                  ></sl-icon>
                  ${msg('Cancel Event')}
                </sl-button>
              `);
            }
            if (iAmParticipant) {
              buttons.push(html`
                <sl-button
                  variant="warning"
                  pill
                  @click=${() =>
                    (
                      this.shadowRoot?.getElementById(
                        'cancel-participation'
                      ) as CreateCancellationDialog
                    ).show()}
                >
                  <sl-icon
                    slot="prefix"
                    .src=${wrapPathInSvg(mdiCancel)}
                  ></sl-icon>
                  ${msg('Cancel Participation')}
                </sl-button>
              `);
            } else {
              const isMaximumPeopleReached =
                !!callToAction.entry.needs[0].max_possible &&
                participants.length >= callToAction.entry.needs[0].max_possible;
              const participateButton = html`
                <sl-button
                  variant="primary"
                  pill
                  .disabled=${isMaximumPeopleReached}
                  @click=${() =>
                    (
                      this.shadowRoot?.querySelector(
                        'participate-dialog'
                      ) as ParticipateDialog
                    ).show()}
                >
                  <sl-icon
                    slot="prefix"
                    .src=${wrapPathInSvg(mdiAccountPlus)}
                  ></sl-icon>
                  ${msg('Participate')}
                </sl-button>
              `;

              const participateButtonWithTooltip = isMaximumPeopleReached
                ? html`<sl-tooltip .content=${msg('Max. participants reached')}
                    >${participateButton}</sl-tooltip
                  >`
                : participateButton;

              buttons.push(html`
                <interested-button
                  .eventHash=${this.eventHash}
                ></interested-button>
                ${participateButtonWithTooltip}
              `);
            }
          }

          return html`<div
            class="column"
            style="position:absolute; right: 16px; bottom: 16px; gap: 8px"
          >
            <create-cancellation-dialog
              id="cancel-participation"
              .label=${msg('Cancel My Participation')}
              .warning=${msg(
                'Are you sure you want to cancel your participation? All event participants will be notified.'
              )}
              .cancelledHash=${participantsMap.get(
                this.gatherStore.client.client.myPubKey
              )}
            ></create-cancellation-dialog>
            ${buttons.map(b => b)}
          </div> `;
        },
        pending: () =>
          html`<div class="column" style="gap: 8px">
            ${Array(3).map(
              () =>
                html`<sl-skeleton
                  style="border-radius: 8px; width: 80px; height: 30px"
                ></sl-skeleton>`
            )}
          </div>`,
        error: e =>
          html`<display-errori .error=${e} .headline=${msg(
            'Error fetching the participants for the proposal'
          )}></display-error>`,
      })
    )}`;
  }

  renderDetail(event: EventWithStatus) {
    return html`
      <sl-card class="column">
        <show-image
          slot="image"
          .imageHash=${event.currentEvent.entry.image}
          style="height: 300px; flex: 1"
        ></show-image>

        <div class="column" style="flex: 1; gap: 16px">
          <div class="row" style="align-items: center">
            <span class="title" style="flex: 1">
              ${event.currentEvent.entry.title}</span
            >
            ${this.renderStatus(event)}
          </div>

          <cancellations-for
            .label=${msg('Event has been cancelled')}
            .cancelledHash=${this.eventHash}
            .hideNoCancellationsNotice=${true}
          ></cancellations-for>

          <span style="white-space: pre-line"
            >${event.currentEvent.entry.description}</span
          >

          <div
            style="display: flex; flex-direction: row; align-items: center; gap: 4px"
          >
            <sl-icon
              style="font-size: 24px"
              title=${msg('location')}
              .src=${wrapPathInSvg(mdiMapMarker)}
            ></sl-icon>
            <span style="white-space: pre-line"
              >${event.currentEvent.entry.location}</span
            >
          </div>

          <div
            style="display: flex; flex-direction: row; align-items: center; gap: 4px"
          >
            <sl-icon
              style="font-size: 24px"
              title=${msg('time')}
              .src=${wrapPathInSvg(mdiCalendarClock)}
            ></sl-icon>
            <span
              >${new Date(
                event.currentEvent.entry.time.start_time / 1000
              ).toLocaleString([], {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
              -
              ${new Date(
                (event.currentEvent.entry.time as any).end_time / 1000
              ).toLocaleString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}</span
            >
          </div>

          ${event.currentEvent.entry.cost
            ? html` <div
                style="display: flex; flex-direction: row; align-items: center; gap: 4px"
              >
                <sl-icon
                  style="font-size: 24px"
                  title=${msg('cost')}
                  .src=${wrapPathInSvg(mdiCash)}
                ></sl-icon>
                <span style="white-space: pre-line"
                  >${event.currentEvent.entry.cost}</span
                >
              </div>`
            : html``}
        </div>
      </sl-card>
    `;
  }

  renderEvent(event: EventWithStatus) {
    if (this._editing) {
      return html` <edit-event
        .originalEventHash=${this.eventHash}
        .currentRecord=${event.currentEvent}
        @event-updated=${async () => {
          this._editing = false;
        }}
        @edit-cancelled=${() => {
          this._editing = false;
        }}
        style=${styleMap({
          margin: this._isMobile ? '0' : '16px',
          width: this._isMobile ? '100%' : '600px',
        })}
      ></edit-event>`;
    }

    if (this._isMobile)
      return html`
        <sl-tab-group placement="bottom" style="flex: 1; width: 100%;">
          <sl-tab slot="nav" panel="event">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiCalendar)}></sl-icon>
              <span>${msg('Event')}</span>
            </div>
          </sl-tab>
          <sl-tab slot="nav" panel="participants">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiAccountGroup)}></sl-icon>
              <span>${msg('Participants')}</span>
            </div>
          </sl-tab>
          <sl-tab slot="nav" panel="needs">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiFormatListChecks)}></sl-icon>
              <span>${msg('Needs')}</span>
            </div>
          </sl-tab>
          <sl-tab slot="nav" panel="activity">
            <div
              class=${classMap({
                row: !this._isMobile,
                column: this._isMobile,
              })}
              style="gap: 8px; align-items: center"
            >
              <sl-icon .src=${wrapPathInSvg(mdiTimeline)}></sl-icon>
              <span>${msg('Activity')}</span>
            </div>
          </sl-tab>

          <sl-tab-panel name="event" style="position: relative">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div
                    class="column"
                    style="padding: 16px; gap: 16px; margin-bottom: 200px"
                  >
                    ${this.renderDetail(event)}
                    <span class="title">${msg('My Commitments')}</span>
                    <sl-card>
                      <my-commitments-for-call-to-action
                        .hideNeeds=${[0]}
                        .callToActionHash=${event.currentEvent.entry
                          .call_to_action_hash}
                        style="flex: 1"
                      ></my-commitments-for-call-to-action>
                    </sl-card>
                  </div>
                </div>
              </div>
            </div>
            ${this.renderActions(event)}
          </sl-tab-panel>
          <sl-tab-panel name="participants" style="position: relative">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div
                    class="column"
                    style="padding: 16px; gap: 16px;  margin-bottom: 200px"
                  >
                    <participants-for-event
                      .eventHash=${this.eventHash}
                    ></participants-for-event>
                  </div>
                </div>
              </div>
            </div>
            ${this.renderActions(event)}
          </sl-tab-panel>
          <sl-tab-panel name="needs" style="position: relative">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div
                    class="column"
                    style="padding: 16px; gap: 16px;  margin-bottom: 200px"
                  >
                    <call-to-action-needs
                      .callToActionHash=${event.currentEvent.entry
                        .call_to_action_hash}
                    ></call-to-action-needs>
                  </div>
                </div>
              </div>
            </div>
            ${this.renderActions(event)}
          </sl-tab-panel>
          <sl-tab-panel name="activity">
            <div class="flex-scrollable-parent">
              <div class="flex-scrollable-container">
                <div class="flex-scrollable-y">
                  <div class="column" style="padding: 16px; gap: 16px">
                    <event-activity
                      .eventHash=${this.eventHash}
                    ></event-activity>
                  </div>
                </div>
              </div>
            </div>
          </sl-tab-panel>
        </sl-tab-group>
      `;

    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div
              class="column"
              style="gap: 16px; align-items: center; margin: 16px"
            >
              ${this.renderDetail(event)}

              <div class="row" style="gap: 16px">
                <div class="column" style="gap: 16px">
                  <span class="title">${msg('Participants')}</span>
                  <participants-for-event
                    style="width: 400px"
                    .eventHash=${this.eventHash}
                  ></participants-for-event>
                </div>
                <call-to-action-needs
                  .callToActionHash=${event.currentEvent.entry
                    .call_to_action_hash}
                ></call-to-action-needs>
              </div>
            </div>
            <sl-drawer .label=${msg('Activity')}>
              <event-activity
                style="flex: 1"
                .eventHash=${event.originalActionHash}
              ></event-activity>
            </sl-drawer>
          </div>
        </div>
      </div>
      ${this.renderActions(event)}
    `;
  }

  render() {
    return html`${subscribe(
      this.gatherStore.events.get(this.eventHash).status,
      withSpinnerAndDisplayError({
        complete: event => html` <create-cancellation-dialog
            id="cancel-event"
            .label=${msg('Cancel Event')}
            .warning=${msg(
              'Are you sure you want to cancel this event? All participants will be notified.'
            )}
            .cancelledHash=${this.eventHash}
          ></create-cancellation-dialog>
          <participate-dialog .eventHash=${this.eventHash}></participate-dialog>
          ${this.renderEvent(event)}`,
        error: {
          tooltip: false,
          label: msg('Error fetching the event'),
        },
      })
    )}`;
  }

  static styles = [
    styles,
    css`
      :host {
        position: relative;
        display: flex;
        align-items: center;
        flex-direction: column;
      }
      sl-tab {
        background-color: white;
      }
      sl-tab sl-icon {
        font-size: 24px;
      }
      sl-tab-panel {
        --padding: 0;
      }
    `,
  ];
}
