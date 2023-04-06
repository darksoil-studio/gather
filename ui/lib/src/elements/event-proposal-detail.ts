import { localized, msg } from '@lit/localize';
import { customElement } from 'lit/decorators.js';
import { html } from 'lit';

import '@holochain-open-dev/elements/elements/display-error.js';
import '@holochain-open-dev/profiles/elements/agent-avatar.js';
import '@holochain-open-dev/file-storage/elements/show-image.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/skeleton/skeleton.js';

import { consume } from '@lit-labs/context';
import '@darksoil/assemble/elements/call-to-action-detail.js';
//@ts-ignore
import { CallToActionDetail } from '@darksoil/assemble/elements/call-to-action-detail.js';
import { wrapPathInSvg } from '@holochain-open-dev/elements';
import { toPromise } from '@holochain-open-dev/stores';
import { mdiCalendarClock, mdiCash, mdiMapMarker } from '@mdi/js';
import { CallToAction } from '@darksoil/assemble';
import { EntryRecord } from '@holochain-open-dev/utils';
import { decode } from '@msgpack/msgpack';
import { ActionHash } from '@holochain/client';
import { GatherStore } from '../gather-store';
import { gatherStoreContext } from '../context';

//@ts-ignore
@localized()
//@ts-ignore
@customElement('event-proposal-detail')
export class EventProposalDetail extends CallToActionDetail {
  /**
   * @internal
   */
  //@ts-ignore
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  async createCollectiveCommitment(satisfactions_hashes: Array<ActionHash>) {
    await super.createCollectiveCommitment(satisfactions_hashes);

    const callToAction: EntryRecord<CallToAction> = await toPromise(
      //@ts-ignore
      this.assembleStore.callToActions.get(this.callToActionHash)
    );
    const customContent = decode(callToAction.entry.custom_content) as any;

    await this.gatherStore.client.createEvent({
      title: callToAction.entry.title,
      ...customContent,
    });
    //@ts-ignore
    // TODO: improve this so that we don't need to delete the calltoaction
    await this.assembleStore.client.deleteCallToAction(this.callToActionHash);
  }

  renderCustomContent(callToAction: EntryRecord<CallToAction>) {
    const customContent = decode(callToAction.entry.custom_content) as any;
    return html`
      <div style="display: flex; flex-direction: column; margin-bottom: 16px">
        <show-image
          slot="image"
          .imageHash=${customContent.image}
          style="width: 700px; height: 300px; flex-basis: 0; margin: 16px;"
        ></show-image>
        <span style="white-space: pre-line; margin-bottom: 16px;"
          >${customContent.description}</span
        >

        <div style="display: flex; flex-direction: row;">
          <div class="column" style="justify-content: end">
            <div
              style="display: flex; flex-direction: row; align-items: center;"
            >
              <sl-icon
                style="margin-right: 4px"
                .src=${wrapPathInSvg(mdiMapMarker)}
              ></sl-icon>
              <span style="white-space: pre-line"
                >${customContent.location}</span
              >
            </div>

            <div
              style="display: flex; flex-direction: row; align-items: center"
            >
              <sl-icon
                style="margin-right: 4px"
                .src=${wrapPathInSvg(mdiCalendarClock)}
              ></sl-icon>
              <span style="white-space: pre-line"
                >${new Date(
                  customContent.start_time / 1000
                ).toLocaleString()}</span
              >
            </div>

            ${customContent.cost
              ? html` <div
                  style="display: flex; flex-direction: row; align-items: center"
                >
                  <sl-icon
                    style="margin-right: 4px"
                    .src=${wrapPathInSvg(mdiCash)}
                  ></sl-icon>
                  <span style="white-space: pre-line"
                    >${customContent.cost}</span
                  >
                </div>`
              : html``}
          </div>
        </div>
      </div>
    `;
  }
}
