import {
  hashProperty,
  notifyError,
  onSubmit,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import SlInput from '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';

import '@holochain-open-dev/elements/dist/elements/sl-datetime-input.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event as GatherEvent, Proposal } from '../types.js';
import { mdiCancel } from '@mdi/js';
import { CreateCancellationDialog } from '@holochain-open-dev/cancellations/dist/elements/create-cancellation-dialog.js';

@localized()
@customElement('edit-proposal')
export class EditProposal extends LitElement {
  @property(hashProperty('original-proposal-hash'))
  originalProposalHash!: ActionHash;

  @property()
  currentRecord!: EntryRecord<Proposal>;

  @consume({ context: gatherStoreContext })
  gatherStore!: GatherStore;

  firstUpdated() {
    this.shadowRoot?.querySelector('form')!.reset();
  }

  @state()
  updating = false;

  async updateProposal(fields: any) {
    if (this.updating) return;
    this.updating = true;

    const proposal: Proposal = {
      ...fields,
      call_to_action_hash: this.currentRecord.entry.call_to_action_hash,

      time: {
        type: 'Unique',
        start_time: new Date(fields.start_time).valueOf() * 1000,
        end_time: new Date(fields.end_time).valueOf() * 1000,
      },
    };

    try {
      const updateRecord = await this.gatherStore.client.updateProposal(
        this.originalProposalHash,
        this.currentRecord.actionHash,
        proposal
      );

      this.dispatchEvent(
        new CustomEvent('proposal-updated', {
          composed: true,
          bubbles: true,
          detail: {
            originalProposalHash: this.originalProposalHash,
            previousProposalHash: this.currentRecord.actionHash,
            updatedProposalHash: updateRecord.actionHash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error updating the proposal'));
      console.error(e);
    }
    this.updating = false;
  }

  render() {
    return html` <create-cancellation-dialog
        .label=${msg('Cancel Proposal')}
        .warning=${msg(
          'Are you sure you want to cancel this proposal? This cannot be reversed. All participants will be notified.'
        )}
        .cancelledHash=${this.originalProposalHash}
      ></create-cancellation-dialog>
      <sl-card style="display: flex;">
        <span slot="header">${msg('Edit Proposal')}</span>
        <form
          style="display: flex; flex-direction: column; margin: 0;"
          ${onSubmit(fields => this.updateProposal(fields))}
        >
          <upload-files
            name="image"
            required
            one-file
            .defaultValue=${this.currentRecord.entry.image}
            accepted-files="image/jpeg,image/png,image/gif"
          ></upload-files>

          <sl-input
            name="title"
            required
            .label=${msg('Title')}
            style="margin-bottom: 16px; margin-top: 16px"
            .defaultValue=${this.currentRecord.entry.title}
          ></sl-input>
          <sl-input
            name="description"
            required
            .label=${msg('Description')}
            style="margin-bottom: 16px"
            .defaultValue=${this.currentRecord.entry.description}
          ></sl-input>

          <div class="row" style="margin-bottom: 16px">
            <sl-datetime-input
              name="start_time"
              id="start-time"
              .defaultValue=${this.currentRecord.entry.time
                ? new Date(this.currentRecord.entry.time.start_time / 1000)
                : undefined}
              .label=${msg('Start Time')}
              style="flex: 1; margin-right: 16px"
              @input=${() => this.requestUpdate()}
            ></sl-datetime-input>
            <sl-datetime-input
              required
              .min=${(this.shadowRoot?.getElementById('start-time') as SlInput)
                ?.value}
              name="end_time"
              .defaultValue=${this.currentRecord.entry.time
                ? new Date(
                    (this.currentRecord.entry.time as any).end_time / 1000
                  )
                : undefined}
              .label=${msg('End Time')}
              style="flex: 1;"
            ></sl-datetime-input>
          </div>

          <div class="row" style="margin-bottom: 16px">
            <sl-input
              name="location"
              style="flex: 1; margin-right: 16px"
              .label=${msg('Location')}
              .defaultValue=${this.currentRecord.entry.location}
            ></sl-input>
            <sl-input
              name="cost"
              style="flex: 1;"
              .label=${msg('Cost')}
              .defaultValue=${this.currentRecord.entry.cost || ''}
            ></sl-input>
          </div>

          <div style="display: flex; flex-direction: row">
            <sl-button
              variant="warning"
              pill
              @click=${() => {
                (
                  this.shadowRoot?.querySelector(
                    'create-cancellation-dialog'
                  ) as CreateCancellationDialog
                ).show();
              }}
            >
              <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiCancel)}></sl-icon>
              ${msg('Cancel Proposal')}
            </sl-button>
            <sl-button
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent('edit-canceled', {
                    bubbles: true,
                    composed: true,
                  })
                )}
              style="flex: 1; margin-right: 16px"
            >
              ${msg('Cancel')}
            </sl-button>
            <sl-button
              variant="primary"
              type="submit"
              style="flex: 1;"
              .loading=${this.updating}
            >
              ${msg('Save')}
            </sl-button>
          </div>
        </form></sl-card
      >`;
  }

  static styles = [sharedStyles];
}
