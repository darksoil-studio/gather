import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey, Record } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import {
  joinAsync,
  StoreSubscriber,
  toPromise,
} from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/dist/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/relative-time/relative-time.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';

import '@darksoil/assemble/dist/elements/call-to-action-unsatisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-satisfied-needs.js';
import '@darksoil/assemble/dist/elements/call-to-action-need-progress.js';

import './participants-for-event.js';
import './edit-event.js';

import { gatherStoreContext, isMobileContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event, EventStatus, EventWithStatus } from '../types.js';
import {
  mdiAccountGroup,
  mdiAccountPlus,
  mdiCalendar,
  mdiCalendarClock,
  mdiCancel,
  mdiCash,
  mdiCheckDecagram,
  mdiDelete,
  mdiFormatListChecks,
  mdiMapMarker,
  mdiPencil,
  mdiTimeline,
} from '@mdi/js';
import { SlDialog } from '@shoelace-style/shoelace';
import { CallToAction } from '@darksoil/assemble';
import { isExpired } from '../utils.js';
import { classMap } from 'lit/directives/class-map.js';

@localized()
@customElement('event-activity')
export class EventActivity extends LitElement {
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
  _eventActivity = new StoreSubscriber(
    this,
    () => this.gatherStore.eventsActivity.get(this.eventHash),
    () => [this.eventHash]
  );

  /**
   * @internal
   */
  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  renderAction(record: Record) {
    return html`<sl-card>Someone did something</sl-card>`;
  }

  render() {
    switch (this._eventActivity.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return html`
          <div class="column" style="gap: 16px">
            ${this._eventActivity.value.value.map(r => this.renderAction(r))}
          </div>
        `;
      case 'error':
        return html`<display-error
          .error=${this._eventActivity.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      sl-tab-group::part(body) {
        display: flex;
        flex: 1;
      }
      sl-tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: white;
      }
      sl-tab-group {
        display: flex;
      }
      sl-tab-group::part(base) {
        display: flex;
        flex: 1;
      }
      sl-tab-panel {
        width: 100%;
        --padding: 0;
      }
      sl-tab-panel {
        --padding: 0;
        padding: 16px;
      }
      sl-tab sl-icon {
        font-size: 24px;
      }
    `,
  ];
}
