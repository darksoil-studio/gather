import {
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { ActionHash, Record } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg, str } from '@lit/localize';
import { LitElement, html, css } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property } from 'lit/decorators.js';

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
import {
  mdiCancel,
  mdiCheckBold,
  mdiCreation,
  mdiHandshake,
  mdiPartyPopper,
  mdiUndo,
  mdiUpdate,
} from '@mdi/js';
import { styleMap } from 'lit/directives/style-map.js';
import { EventAction } from '../types.js';

@localized()
@customElement('event-activity')
export class EventActivity extends LitElement {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  @property(hashProperty('proposal-hash'))
  proposalHash!: ActionHash;

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
    () =>
      this.eventHash
        ? this.gatherStore.eventActivity.get(this.eventHash)
        : this.gatherStore.proposalActivity.get(this.proposalHash),
    () => [this.eventHash, this.proposalHash]
  );

  /**
   * @internal
   */
  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  messageAndIcon(action: EventAction) {
    switch (action.type) {
      case 'proposal_created':
        return {
          message: msg('Proposal was created.'),
          icon: wrapPathInSvg(mdiCreation),
        };
      case 'proposal_cancelled':
        return {
          message: msg('Proposal was cancelled because:'),
          secondary: action.record.entry.reason,
          icon: wrapPathInSvg(mdiCancel),
        };
      case 'proposal_updated':
        return {
          message: msg('Proposal was updated.'),
          icon: wrapPathInSvg(mdiUpdate),
        };
      case 'event_created':
        return {
          message: action.record.entry.from_proposal
            ? msg('The proposal succeeded! It is now an event.')
            : msg('Event was created.'),
          icon: wrapPathInSvg(mdiCreation),
        };
      case 'event_cancelled':
        return {
          message: msg('Event was cancelled because:'),
          secondary: action.record.entry.reason,
          icon: wrapPathInSvg(mdiCancel),
        };
      case 'event_updated':
        return {
          message: msg('Event was updated.'),
          icon: wrapPathInSvg(mdiUpdate),
        };
      case 'commitment_created':
        if (action.record.entry.need_index === 0) {
          return {
            message: msg('New commitment to participate in the event.'),
            icon: wrapPathInSvg(mdiHandshake),
          };
        }
        return {
          message: msg('New contribution:'),
          secondary: msg(
            str`Commitment to contribute ${
              action.record.entry.amount
            } to need "${
              action.callToAction.entry.needs[action.record.entry.need_index]
                .description
            }".`
          ),
          icon: wrapPathInSvg(mdiHandshake),
        };
      case 'commitment_cancelled':
        return {
          message: msg(
            str`Commitment to contribute to need "${
              action.callToAction.entry.needs[
                action.commitment.entry.need_index
              ].description
            }" was cancelled because:`
          ),
          secondary: action.record.entry.reason,
          icon: wrapPathInSvg(mdiCancel),
        };
      case 'commitment_cancellation_undone':
        return {
          message: msg('Commitment was uncancelled.'),
          icon: wrapPathInSvg(mdiUndo),
        };
      case 'satisfaction_created':
        if (action.record.entry.need_index === 0) {
          return {
            message: msg(
              'The minimum required participants for the event has been reached.'
            ),
            icon: wrapPathInSvg(mdiHandshake),
          };
        }
        return {
          message: msg(
            str`Need "${
              action.callToAction.entry.needs[action.record.entry.need_index]
                .description
            }" was satisfied.`
          ),
          icon: wrapPathInSvg(mdiCheckBold),
        };
      case 'assembly_created':
        return {
          message: msg('All needs have been satisfied!'),
          icon: wrapPathInSvg(mdiPartyPopper),
        };
    }
  }

  renderAction(action: EventAction, first: boolean, last: boolean) {
    const info = this.messageAndIcon(action)!;
    const message = info.message;
    const icon = info.icon;
    const secondary = info.secondary;

    return html`
      <div class="row">
        <div class="column" style="align-items: center">
          <sl-divider
            vertical
            style=${styleMap({
              '--width': '2px',
              '--color': 'grey',
              opacity: first ? 0 : 1,
            })}
          ></sl-divider>
          <sl-icon .src=${icon}></sl-icon>
          <sl-divider
            vertical
            style=${styleMap({
              '--width': '2px',
              '--color': 'grey',
              opacity: last ? 0 : 1,
            })}
          ></sl-divider>
        </div>
        <sl-card style="flex: 1; margin-bottom: 8px; margin-top: 8px">
          <div class="column" style="gap: 8px; flex: 1">
            <span>${message}</span>
            ${secondary
              ? html` <span class="placeholder">${secondary}</span> `
              : html``}
            <div class="row placeholder" style="align-items: center">
              <span style="flex: 1"></span>
              <span>${msg('By')}&nbsp;</span>
              <agent-avatar
                .agentPubKey=${action.record.action.author}
              ></agent-avatar>
              <span>&nbsp;</span>
              <sl-relative-time
                .date=${new Date(Math.floor(action.record.action.timestamp))}
              ></sl-relative-time>
            </div>
          </div>
        </sl-card>
      </div>
    `;
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
        const activity = this._eventActivity.value.value;
        return html`
          <div class="column" style="flex: 1">
            ${activity.map((r, i) =>
              this.renderAction(r, i === 0, i === activity.length - 1)
            )}
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
