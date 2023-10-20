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
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@holochain-open-dev/file-storage/dist/elements/upload-files.js';

import '@holochain-open-dev/elements/dist/elements/sl-datetime-input.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import {
  Event as GatherEvent,
  Proposal,
  ProposalWithStatus,
} from '../types.js';
import { mdiCancel } from '@mdi/js';
import { CreateCancellationDialog } from '@holochain-open-dev/cancellations/dist/elements/create-cancellation-dialog.js';

@localized()
@customElement('edit-proposal')
export class EditProposal extends LitElement {
  @property(hashProperty('original-proposal-hash'))
  originalProposalHash!: ActionHash;

  @property()
  proposal!: ProposalWithStatus;

  @consume({ context: gatherStoreContext })
  gatherStore!: GatherStore;

  firstUpdated() {
    this.timeTbd = !this.proposal.currentProposal.entry.time;
    this.locationTbd = !this.proposal.currentProposal.entry.location;
    this.shadowRoot?.querySelector('form')!.reset();
  }

  @state()
  timeTbd = false;

  @state()
  locationTbd = false;

  @state()
  committing = false;

  async updateProposal(fields: any) {
    if (this.committing) return;
    this.committing = true;

    const time = this.timeTbd
      ? undefined
      : {
          type: 'Unique',
          start_time: new Date(fields.start_time).valueOf() * 1000,
          end_time: new Date(fields.end_time).valueOf() * 1000,
        };
    const location = this.locationTbd ? undefined : fields.location;

    const proposal: Proposal = {
      ...fields,
      call_to_action_hash:
        this.proposal.currentProposal.entry.call_to_action_hash,
      hosts: this.proposal.currentProposal.entry.hosts,
      location,
      time,
    };

    if (this.isReadyToConvertToEvent()) {
      try {
        const event = await this.gatherStore.client.createEvent({
          ...proposal,
          from_proposal: {
            proposal_hash: this.proposal.originalActionHash,
            assembly_hash: (this.proposal.status as any).assemblyHash,
          },
        } as GatherEvent);

        this.dispatchEvent(
          new CustomEvent('event-created', {
            composed: true,
            bubbles: true,
            detail: {
              eventHash: event.actionHash,
            },
          })
        );
      } catch (e: any) {
        notifyError(msg('Error creating the event'));
        console.error(e);
      }
    } else {
      try {
        const updateRecord = await this.gatherStore.client.updateProposal(
          this.originalProposalHash,
          this.proposal.currentProposal.actionHash,
          proposal
        );

        this.dispatchEvent(
          new CustomEvent('proposal-updated', {
            composed: true,
            bubbles: true,
            detail: {
              originalProposalHash: this.originalProposalHash,
              previousProposalHash: this.proposal.currentProposal.actionHash,
              updatedProposalHash: updateRecord.actionHash,
            },
          })
        );
      } catch (e: any) {
        notifyError(msg('Error updating the proposal'));
        console.error(e);
      }
    }
    this.committing = false;
  }

  isReadyToConvertToEvent() {
    return (
      this.proposal.status.type === 'fulfilled_proposal' &&
      !this.locationTbd &&
      !this.timeTbd
    );
  }

  render() {
    return html` <create-cancellation-dialog
        .label=${msg('Cancel Proposal')}
        .warning=${msg(
          'Are you sure you want to cancel this proposal? This cannot be reversed. All participants will be notified.'
        )}
        .cancelledHash=${this.originalProposalHash}
      ></create-cancellation-dialog>
      <sl-card style="display: flex; flex: 1">
        <span slot="header">${msg('Edit Proposal')}</span>
        <form
          style="display: flex; flex-direction: column; flex: 1; margin: 0; gap: 16px"
          ${onSubmit(fields => this.updateProposal(fields))}
        >
          <upload-files
            name="image"
            required
            one-file
            .defaultValue=${this.proposal.currentProposal.entry.image}
            accepted-files="image/jpeg,image/png,image/gif"
          ></upload-files>

          <sl-input
            name="title"
            required
            .label=${msg('Title')}
            .defaultValue=${this.proposal.currentProposal.entry.title}
          ></sl-input>
          <sl-textarea
            name="description"
            required
            .label=${msg('Description')}
            .defaultValue=${this.proposal.currentProposal.entry.description}
          ></sl-textarea>

          <div class="row" style="gap: 8px; align-items: center;">
            <div class="column" style="gap: 8px; flex: 1">
              <sl-datetime-input
                name="start_time"
                id="start-time"
                .required=${!this.timeTbd}
                .disabled=${this.timeTbd}
                .defaultValue=${this.proposal.currentProposal.entry.time
                  ? new Date(
                      this.proposal.currentProposal.entry.time.start_time / 1000
                    )
                  : undefined}
                .label=${msg('Start Time')}
                style="flex: 1;"
                @input=${() => this.requestUpdate()}
              ></sl-datetime-input>
              <sl-datetime-input
                .required=${!this.timeTbd}
                .disabled=${this.timeTbd}
                .min=${(
                  this.shadowRoot?.getElementById('start-time') as SlInput
                )?.value}
                name="end_time"
                .defaultValue=${this.proposal.currentProposal.entry.time
                  ? new Date(
                      (this.proposal.currentProposal.entry.time as any)
                        .end_time / 1000
                    )
                  : undefined}
                .label=${msg('End Time')}
                style="flex: 1;"
              ></sl-datetime-input>
            </div>
            <sl-switch
              style="margin-top: 16px"
              .checked=${this.timeTbd}
              @sl-change=${() => {
                this.timeTbd = !this.timeTbd;
              }}
              >${msg('TBD')}</sl-switch
            >
          </div>

          <div class="row" style="gap: 8px; align-items: center">
            <sl-input
              name="location"
              style="flex: 1;"
              .required=${!this.locationTbd}
              .disabled=${this.locationTbd}
              .label=${msg('Location')}
              .defaultValue=${this.proposal.currentProposal.entry.location}
            ></sl-input>
            <sl-switch
              .checked=${this.locationTbd}
              style="margin-top: 16px"
              @sl-change=${() => {
                this.locationTbd = !this.locationTbd;
              }}
              >${msg('TBD')}</sl-switch
            >
          </div>

          <sl-input
            name="cost"
            style="flex: 1;"
            .label=${msg('Cost')}
            .defaultValue=${this.proposal.currentProposal.entry.cost || ''}
          ></sl-input>

          <div style="display: flex; flex-direction: row; gap: 8px">
            <sl-button
              variant="warning"
              @click=${() => {
                (
                  this.shadowRoot?.querySelector(
                    'create-cancellation-dialog'
                  ) as CreateCancellationDialog
                ).show();
              }}
              style="flex: 1;"
            >
              <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiCancel)}></sl-icon>
              ${msg('Cancel Proposal')}
            </sl-button>
            <sl-button
              .variant=${this.isReadyToConvertToEvent() ? 'success' : 'primary'}
              type="submit"
              style="flex: 1;"
              .loading=${this.committing}
            >
              ${this.isReadyToConvertToEvent()
                ? msg('Create Event')
                : msg('Save')}
            </sl-button>
          </div>
        </form></sl-card
      >`;
  }

  static styles = [sharedStyles];
}
