import {
  AssembleStore,
  assembleStoreContext,
  CallToAction,
  Commitment,
  Need,
} from '@darksoil/assemble';
import { hashProperty, wrapPathInSvg } from '@holochain-open-dev/elements';
import {
  joinAsync,
  pipe,
  sliceAndJoin,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { mdiInformationOutline } from '@mdi/js';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import { styles } from '../../../styles.js';

@localized()
@customElement('call-to-action-unsatisfied-needs-summary')
export class CallToActionUnsatisfiedNeedsSummary extends LitElement {
  // REQUIRED. The hash of the CallToAction to show
  @property(hashProperty('call-to-action-hash'))
  callToActionHash!: ActionHash;

  /**
   * @internal
   */
  @consume({ context: assembleStoreContext, subscribe: true })
  assembleStore!: AssembleStore;

  /**
   * @internal
   */
  _callToActionInfo = new StoreSubscriber(
    this,
    () =>
      joinAsync([
        this.assembleStore.callToActions.get(this.callToActionHash),
        pipe(
          this.assembleStore.satisfactionsForCallToAction.get(
            this.callToActionHash
          ),
          hashes => sliceAndJoin(this.assembleStore.satisfactions, hashes)
        ),
      ]),
    () => [this.callToActionHash]
  );

  renderUnsatisfiedNeedsSummary(
    callToAction: EntryRecord<CallToAction>,
    needs: Array<[Need, number]>
  ) {
    if (needs.length === 0)
      return html` <div
        style="flex: 1; display: flex; align-items: center; flex-direction: column; margin: 48px; gap: 16px"
      >
        <sl-icon
          .src=${wrapPathInSvg(mdiInformationOutline)}
          style="font-size: 64px; color: grey"
        ></sl-icon>
        <span class="placeholder"
          >${msg('There are no unsatisfied needs.')}</span
        >
      </div>`;

    return html`<sl-card style="flex: 1">
      <div class="column" style="gap: px; flex: 1">
        ${needs.map(
          need => html`<div class="row" style="gap: 8px">
            <span style="flex: 1">${need[0].description}</span>
            <call-to-action-need-progress
              style="flex-basis: 300px"
              .callToActionHash=${this.callToActionHash}
              .needIndex=${need[1]}
            ></call-to-action-need-progress>
          </div>`
        )}
      </div>
    </sl-card>`;
  }

  render() {
    switch (this._callToActionInfo.value.status) {
      case 'pending':
        return html`
          <div class="column" style="gap: 8px">
            <sl-skeleton></sl-skeleton>
            <sl-skeleton></sl-skeleton>
            <sl-skeleton></sl-skeleton>
          </div>
        `;
      case 'complete':
        const callToAction = this._callToActionInfo.value.value[0];
        const satisfactions = this._callToActionInfo.value.value[1];

        const unsatisfiedNeeds = callToAction.entry.needs
          .map((need, i) => [need, i] as [Need, number])
          .filter(
            ([need, i]) =>
              need.min_necessary > 0 &&
              !Array.from(satisfactions.values()).find(
                s => s.entry.need_index === i
              )
          ) as Array<[Need, number]>;
        return this.renderUnsatisfiedNeedsSummary(
          callToAction,
          unsatisfiedNeeds
        );
      case 'error':
        return html`<display-error
          .headline=${msg(
            'Error fetching the commitments for this call to action'
          )}
          .error=${this._callToActionInfo.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = styles;
}
