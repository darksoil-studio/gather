import { notifyError, sharedStyles } from '@holochain-open-dev/elements';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { msg } from '@lit/localize';
import { SlDialog } from '@shoelace-style/shoelace';
import { html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';

@customElement('participate-dialog')
export class ParticipateDialog extends LitElement {
  @property()
  proposalHash: ActionHash | undefined;

  @property()
  eventHash: ActionHash | undefined;

  /**
   * @internal
   */
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _eventOrProposal = new StoreSubscriber(
    this,
    () => {
      if (this.proposalHash)
        return this.gatherStore.proposals.get(this.proposalHash);
      return this.gatherStore.events.get(this.eventHash!);
    },
    () => [this.proposalHash, this.eventHash]
  );

  @query('sl-dialog')
  dialog!: SlDialog;

  show() {
    this.dialog.show();
  }

  @state()
  committing = false;

  async commitToParticipate(callToActionHash: ActionHash) {
    if (this.committing) return;

    this.committing = true;

    try {
      await this.gatherStore.assembleStore.client.createCommitment({
        amount: 1,
        call_to_action_hash: callToActionHash,
        comment: msg('I commit to participate'),
        need_index: 0,
      });
      await this.gatherStore.client.addToMyEvents(
        this.eventHash ? this.eventHash : this.proposalHash!
      );

      this.dispatchEvent(
        new CustomEvent('participant-added', {
          bubbles: true,
          composed: true,
          detail: {
            eventHash: this.proposalHash,
          },
        })
      );
      this.dialog.hide();
    } catch (e: any) {
      notifyError(msg('Error adding participant.'));
      console.error(e);
    }
    this.committing = false;
  }

  renderContent() {
    switch (this._eventOrProposal.value.status) {
      case 'pending':
        return html``;
      case 'complete':
        const callToActionHash =
          this._eventOrProposal.value.value.entry.call_to_action_hash;
        return html`
          <div class="column" style="gap: 16px">
            <span
              >${this.eventHash
                ? msg(
                    "Participating in the proposal means committing yourself to going, if it actually happens. If you don't want to commit yourself yet, close this dialog and mark yourself as interested."
                  )
                : msg(
                    "Participating in the event means committing yourself to going. If you don't want to commit yourself yet, close this dialog and mark yourself as interested."
                  )}</span
            >
            <span
              >${msg(
                'Are you sure you want to commit yourself to participating in the event?'
              )}</span
            >
          </div>
          <sl-button
            variant="primary"
            slot="footer"
            @click=${() => this.commitToParticipate(callToActionHash)}
            >${msg('Commit to Participate')}</sl-button
          >
        `;
      case 'error':
        return html`<display-error
          .error=${this._eventOrProposal.value.error}
        ></display-error>`;
    }
  }

  render() {
    return html`<sl-dialog .label=${msg('Commit To Participate')}
      >${this.renderContent()}</sl-dialog
    >`;
  }

  static styles = [sharedStyles];
}
