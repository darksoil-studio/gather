import {
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { msg } from '@lit/localize';
import { mdiBell, mdiCheck, mdiClose } from '@mdi/js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';

@customElement('interested-button')
export class InterestedButton extends LitElement {
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
        return this.gatherStore.interestedInProposal.get(this.proposalHash);
      return this.gatherStore.interestedInEvent.get(this.eventHash!);
    },
    () => [this.proposalHash, this.eventHash]
  );

  @state()
  committing = false;

  async addInterest() {
    const eventOrProposalHash = this.proposalHash
      ? this.proposalHash
      : this.eventHash;
    if (this.committing) return;

    this.committing = true;

    try {
      await this.gatherStore.client.addMyselfAsInterested(eventOrProposalHash!);
      let detail;

      if (this.proposalHash) {
        detail = {
          proposalHash: eventOrProposalHash,
        };
      } else {
        detail = {
          eventHash: eventOrProposalHash,
        };
      }

      this.dispatchEvent(
        new CustomEvent('interest-added', {
          bubbles: true,
          composed: true,
          detail,
        })
      );
    } catch (e: any) {
      notifyError(msg('Error adding interest.'));
      console.error(e);
    }
    this.committing = false;
  }

  async removeInterest() {
    const eventOrProposalHash = this.proposalHash
      ? this.proposalHash
      : this.eventHash;
    if (this.committing) return;

    this.committing = true;

    try {
      await this.gatherStore.client.removeMyselfAsInterested(
        eventOrProposalHash!
      );
      let detail;

      if (this.proposalHash) {
        detail = {
          proposalHash: eventOrProposalHash,
        };
      } else {
        detail = {
          eventHash: eventOrProposalHash,
        };
      }

      this.dispatchEvent(
        new CustomEvent('interest-removed', {
          bubbles: true,
          composed: true,
          detail,
        })
      );
    } catch (e: any) {
      notifyError(msg('Error removing interest.'));
      console.error(e);
    }
    this.committing = false;
  }

  render() {
    switch (this._eventOrProposal.value.status) {
      case 'pending':
        return html` <sl-button pill .loading=${true}> </sl-button> `;
      case 'complete':
        const interested = this._eventOrProposal.value.value;

        const iAmInterested = interested.find(
          i =>
            i.toString() === this.gatherStore.client.client.myPubKey.toString()
        );

        if (iAmInterested) {
          return html`
            <sl-button
              pill
              .loading=${this.committing}
              @click=${() => {
                this.removeInterest();
              }}
            >
              <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiClose)}></sl-icon>
              ${msg('Remove Interest')}
            </sl-button>
          `;
        }

        return html`
          <sl-button
            pill
            .loading=${this.committing}
            @click=${() => {
              this.addInterest();
            }}
          >
            <sl-icon slot="prefix" .src=${wrapPathInSvg(mdiBell)}></sl-icon>
            ${msg('Add Interest')}
          </sl-button>
        `;
      case 'error':
        return html`
          <sl-button pill .loading=${true}>
            <display-error
              tooltip
              .heading=${msg('Could not fetch your interest')}
              .error=${this._eventOrProposal.value.error}
            ></display-error>
          </sl-button>
        `;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }

      sl-button {
        flex: 1;
      }
    `,
  ];
}
