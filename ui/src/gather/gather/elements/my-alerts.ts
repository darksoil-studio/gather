import { sharedStyles, wrapPathInSvg } from '@holochain-open-dev/elements';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg, str } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { EventAlert, GatherStore } from '../gather-store.js';
import './event-summary.js';
import { mdiCancel, mdiInformationOutline } from '@mdi/js';
import { Alert } from '../../../alerts/alerts-client.js';
import { EventWithStatus } from '../types.js';
import { styleMap } from 'lit/directives/style-map.js';

@localized()
@customElement('my-alerts')
export class MyAlerts extends LitElement {
  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _myAlerts = new StoreSubscriber(
    this,
    () => this.gatherStore.unreadAlerts,
    () => []
  );

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  messageAndIcon(alert: Alert<EventAlert>, event: EventWithStatus) {
    if (alert.alert.update.type === 'event_was_cancelled') {
      return {
        message: msg(
          html`Event <strong>${event.currentEvent.entry.title}</strong> was
            cancelled`
        ),
        icon: wrapPathInSvg(mdiCancel),
      };
    }
  }

  renderAlert(alert: Alert<EventAlert>, event: EventWithStatus) {
    const { message, icon } = this.messageAndIcon(alert, event)!;
    return html`<sl-card
      style=${styleMap({
        width: this._isMobile ? '' : '500px',
        cursor: 'pointer',
        flex: 1,
      })}
      @click=${() => {
        this.gatherStore.alertsStore.client.markAlertsAsRead([
          alert.createLink.hashed.hash,
        ]);
        this.dispatchEvent(
          new CustomEvent('event-selected', {
            bubbles: true,
            composed: true,
            detail: {
              eventHash: event.originalActionHash,
            },
          })
        );
      }}
    >
      <div class="column" style="gap: 16px; flex: 1">
        <div class="row" style="gap: 16px; flex: 1">
          <sl-icon .src=${icon}></sl-icon>
          <span style="flex: 1">${message}</span>
        </div>
        <div class="row placeholder" style="gap: 16px">
          <span style="flex: 1"> </span>
          <span>${msg('By')}&nbsp;</span>
          <agent-avatar .agentPubKey=${alert.alert.author}></agent-avatar>
          <sl-relative-time
            .date=${new Date(Math.floor(alert.timestamp / 1000))}
          ></sl-relative-time>
        </div>
      </div>
    </sl-card>`;
  }

  renderAlerts(
    alerts: Alert<EventAlert>[],
    events: ReadonlyMap<ActionHash, EventWithStatus>
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
        <span class="placeholder">${msg('You have no unread alerts.')}</span>
      </div>`;

    return html`
      <div class="flex-scrollable-parent">
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
              ${alerts.map(alert =>
                this.renderAlert(alert, events.get(alert.alert.eventHash)!)
              )}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  render() {
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
          this._myAlerts.value.value[1]
        );
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching my alerts')}
          .error=${this._myAlerts.value.error}
        ></display-error>`;
    }
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
