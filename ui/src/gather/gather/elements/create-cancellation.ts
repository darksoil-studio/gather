import { LitElement, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { state, property, query, customElement } from 'lit/decorators.js';
import {
  ActionHash,
  Record,
  DnaHash,
  AgentPubKey,
  EntryHash,
} from '@holochain/client';
import { EntryRecord } from '@holochain-open-dev/utils';
import {
  hashProperty,
  notifyError,
  hashState,
  sharedStyles,
  onSubmit,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { mdiAlertCircleOutline, mdiDelete } from '@mdi/js';

import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';

import SlAlert from '@shoelace-style/shoelace/dist/components/alert/alert.js';
import { GatherStore } from '../gather-store.js';
import { gatherStoreContext } from '../context.js';
import { Cancellation } from '../types.js';

/**
 * @element create-cancellation
 * @fires cancellation-created: detail will contain { cancellationHash }
 */
@localized()
@customElement('create-cancellation')
export class CreateCancellation extends LitElement {
  // REQUIRED. The event hash for this Cancellation
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
  @state()
  committing = false;

  /**
   * @internal
   */
  @query('#create-form')
  form!: HTMLFormElement;

  async createCancellation(fields: any) {
    if (this.eventHash === undefined)
      throw new Error(
        'Cannot create a new Cancellation without its event_hash field'
      );

    try {
      this.committing = true;
      const record: EntryRecord<Cancellation> =
        await this.gatherStore.client.cancelEvent(
          this.eventHash,
          fields.reason
        );

      this.dispatchEvent(
        new CustomEvent('cancellation-created', {
          composed: true,
          bubbles: true,
          detail: {
            cancellationHash: record.actionHash,
          },
        })
      );

      this.form.reset();
    } catch (e: any) {
      console.error(e);
      notifyError(msg('Error creating the cancellation'));
    }
    this.committing = false;
  }

  render() {
    return html` <sl-card style="flex: 1;">
      <span slot="header">${msg('Create Cancellation')}</span>

      <form
        id="create-form"
        style="display: flex; flex: 1; flex-direction: column;"
        ${onSubmit(fields => this.createCancellation(fields))}
      >
        <div style="margin-bottom: 16px;">
          <sl-textarea
            name="reason"
            .label=${msg('Reason')}
            required
          ></sl-textarea>
        </div>

        <sl-button variant="primary" type="submit" .loading=${this.committing}
          >${msg('Create Cancellation')}</sl-button
        >
      </form>
    </sl-card>`;
  }

  static styles = [sharedStyles];
}
