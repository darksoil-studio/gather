import {
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg, str } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';
import {
  mdiClose,
  mdiInformationOutline,
  mdiNotificationClearAll,
} from '@mdi/js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { EventAlert, GatherAlert, GatherStore } from '../gather-store.js';
import './event-summary.js';
import { Alert } from '../../../alerts/alerts-client.js';
import { EventWithStatus, ProposalWithStatus } from '../types.js';
import { styleMap } from 'lit/directives/style-map.js';
import { EventAction, messageAndIcon } from '../activity.js';

@localized()
@customElement('my-alerts')
export class MyAlerts extends LitElement {
  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @state()
  panel: 'unread_alerts' | 'read_alerts' = 'unread_alerts';

  _myAlerts = new StoreSubscriber(
    this,
    () =>
      this.panel === 'unread_alerts'
        ? this.gatherStore.unreadAlerts
        : this.gatherStore.readAlerts,
    () => [this.panel]
  );

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  renderAlert(
    alert: Alert<GatherAlert>,
    action: EventAction,
    events: ReadonlyMap<ActionHash, EventWithStatus>,
    proposals: ReadonlyMap<ActionHash, ProposalWithStatus>
  ) {
    const title =
      alert.alert.type === 'event_alert'
        ? events.get(alert.alert.eventHash)!.currentEvent.entry.title
        : proposals.get(alert.alert.proposalHash)!.currentProposal.entry.title;

    const info = messageAndIcon(action)!;
    if (action.type === 'proposal_created') {
      info.message = msg(
        'A new proposal was created and you were added as one of its hosts.'
      );
    } else if (action.type === 'event_created') {
      info.message = msg(
        'A new event was created and you were added as one of its hosts.'
      );
    }

    return html`
      <div class="row" style="gap: 16px; align-items:center">
        <sl-icon .src=${info.icon} style="font-size: 24px"></sl-icon>
        <sl-card
          style=${styleMap({
            width: this._isMobile ? '' : '500px',
            cursor: 'pointer',
            flex: 1,
          })}
          @click=${() => {
            this.gatherStore.alertsStore.client.markAlertsAsRead([
              alert.createLink.hashed.hash,
            ]);
            if (alert.alert.type === 'event_alert') {
              this.dispatchEvent(
                new CustomEvent('event-selected', {
                  bubbles: true,
                  composed: true,
                  detail: {
                    eventHash: events.get(alert.alert.eventHash)!
                      .originalActionHash,
                  },
                })
              );
            } else {
              this.dispatchEvent(
                new CustomEvent('proposal-selected', {
                  bubbles: true,
                  composed: true,
                  detail: {
                    proposalHash: proposals.get(alert.alert.proposalHash)!
                      .originalActionHash,
                  },
                })
              );
            }
          }}
        >
          <div class="column" style="gap: 16px; flex: 1">
            <span class="title">${title}</span>
            <span>${info.message}</span>

            ${info.secondary
              ? html` <span class="placeholder">${info.secondary}</span> `
              : html``}

            <div class="row placeholder" style="align-items: center; gap: 16px">
              <span style="flex: 1"></span>
              ${'record' in action
                ? html`
                    <agent-avatar
                      .agentPubKey=${action.record.action.author}
                    ></agent-avatar>
                  `
                : html``}
              <sl-relative-time
                .date=${new Date(Math.floor(alert.timestamp / 1000))}
              ></sl-relative-time>
            </div>
          </div>
        </sl-card>
      </div>
    `;
  }

  renderAlerts(
    alerts: Alert<GatherAlert>[],
    actions: EventAction[],
    events: ReadonlyMap<ActionHash, EventWithStatus>,
    proposals: ReadonlyMap<ActionHash, ProposalWithStatus>
  ) {
    if (alerts.length === 0)
      return html` <div
        style="display: flex; align-items: center; flex-direction: column; margin: 48px; gap: 16px; flex: 1"
      >
        <sl-icon
          .src=${wrapPathInSvg(mdiInformationOutline)}
          style="font-size: 96px; color: grey"
          class="placeholder"
        ></sl-icon>
        <span class="placeholder"
          >${this.panel === 'unread_alerts'
            ? msg('You have no unread alerts.')
            : msg('You have no read alerts.')}</span
        >
      </div>`;

    return html`
      <div class="flex-scrollable-parent" style="width: 100%">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div
              class="column"
              style=${styleMap({
                'align-items': this._isMobile ? '' : 'center',
                flex: 1,
                margin: '16px',
                gap: '16px',
              })}
            >
              ${alerts.map((alert, i) =>
                this.renderAlert(alert, actions[i], events, proposals)
              )}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderContent() {
    switch (this._myAlerts.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return this.renderAlerts(
          this._myAlerts.value.value[0],
          this._myAlerts.value.value[1],
          this._myAlerts.value.value[2],
          this._myAlerts.value.value[3]
        );
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching my alerts')}
          .error=${this._myAlerts.value.error}
        ></display-error>`;
    }
  }

  @state()
  committing = false;

  async markAlertsAsRead(alerts: Array<Alert<GatherAlert>>) {
    if (this.committing) return;
    this.committing = true;
    try {
      await this.gatherStore.alertsStore.client.markAlertsAsRead(
        alerts.map(a => a.createLink.hashed.hash)
      );

      this.dispatchEvent(
        new CustomEvent('unread-alerts-dismissed', {
          composed: true,
          bubbles: true,
        })
      );
    } catch (e: any) {
      notifyError(msg('Error dismissing the alerts'));
      console.error(e);
    }
    this.committing = false;
  }

  renderDismissButton() {
    if (
      this.panel !== 'unread_alerts' ||
      this._myAlerts.value.status !== 'complete'
    )
      return html``;
    const alerts = this._myAlerts.value.value[0];
    const button = html`
      <sl-button
        style="position: absolute; right: 16px; bottom: 16px; z-index: 1000"
        pill
        .disabled=${alerts.length === 0}
        @click=${() => {
          this.markAlertsAsRead(alerts);
        }}
        .loading=${this.committing}
        ><sl-icon
          slot="prefix"
          .src=${wrapPathInSvg(mdiNotificationClearAll)}
        ></sl-icon
        >${msg('Dismiss All')}</sl-button
      >
    `;
    if (alerts.length !== 0) return button;
    return html`
      <sl-tooltip .content=${msg('There no unread alerts')}>
        ${button}</sl-tooltip
      >
    `;
  }

  renderPanelRadio() {
    return html`
      <sl-radio-group
        value="unread_alerts"
        @sl-change=${(e: any) => {
          this.panel = e.target.value;
        }}
      >
        <sl-radio-button value="unread_alerts"
          >${msg('Unread')}</sl-radio-button
        >
        <sl-radio-button value="read_alerts">${msg('Read')}</sl-radio-button>
      </sl-radio-group>
    `;
  }

  render() {
    if (this._isMobile)
      return html`
        <div class="column" style="position: relative; flex: 1">
          ${this.renderDismissButton()}
          <div
            class="column"
            style="flex: 1; gap: 16px; margin-top: 16px; align-items: center"
          >
            ${this.renderPanelRadio()} ${this.renderContent()}
          </div>
        </div>
      `;

    return html` <div class="column" style="flex: 1; position: relative">
      ${this.renderDismissButton()}
      <div class="row" style="align-items: center; margin: 8px">
        <span class="title" style="flex: 1"
          >${this.panel === 'unread_alerts'
            ? msg('Unread alerts')
            : msg('Read alerts')}</span
        >
        ${this.renderPanelRadio()}
      </div>
      <sl-divider style="margin: 0 8px; --spacing: 0"></sl-divider>
      ${this.renderContent()}
    </div>`;
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
