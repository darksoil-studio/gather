import {
  hashProperty,
  notifyError,
  sharedStyles,
} from '@holochain-open-dev/elements';
import {
  Profile,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import {
  asyncDeriveStore,
  AsyncReadable,
  join,
  StoreSubscriber,
  toPromise,
} from '@holochain-open-dev/stores';
import { ActionHash, AgentPubKey } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EntryRecord } from '@holochain-open-dev/utils';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';
import '@holochain-open-dev/profiles/dist/elements/profile-list-item-skeleton.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { Event } from '../types.js';

@localized()
@customElement('attendees-for-event')
export class AttendeesForEvent extends LitElement {
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
  @consume({ context: profilesStoreContext, subscribe: true })
  profilesStore!: ProfilesStore;

  /**
   * @internal
   */
  _attendees = new StoreSubscriber(
    this,
    () =>
      join([
        this.gatherStore.events.get(this.eventHash),
        asyncDeriveStore(
          this.gatherStore.attendeesForEvent.get(this.eventHash),
          agentPubKeys => this.profilesStore.agentsProfiles(agentPubKeys)
        ),
      ]) as AsyncReadable<
        [EntryRecord<Event>, ReadonlyMap<AgentPubKey, Profile>]
      >,
    () => [this.eventHash]
  );

  @state()
  committing = false;

  async attendEvent(event: EntryRecord<Event>, attendees: AgentPubKey[]) {
    if (this.committing) return;

    this.committing = true;

    try {
      const callToAction = await toPromise(
        this.gatherStore.assembleStore.callToActions.get(
          event.entry.call_to_action_hash
        )
      );
      const commitmentsForCallToAction = await toPromise(
        this.gatherStore.assembleStore.commitmentsForCallToAction.get(
          event.entry.call_to_action_hash
        )
      );

      if (!callToAction)
        throw new Error(
          msg('Error fetching the call to action for the event.')
        );

      const myCommitment =
        await this.gatherStore.assembleStore.client.createCommitment({
          amount: 1,
          call_to_action_hash: event.entry.call_to_action_hash,
          comment: '',
          need_index: 0,
        });

      const minNecessaryAttendees = callToAction.entry.needs[0].min_necessary;

      if (
        minNecessaryAttendees > 0 &&
        attendees.length + 1 === minNecessaryAttendees
      ) {
        await this.gatherStore.assembleStore.client.createSatisfaction({
          call_to_action_hash: event.entry.call_to_action_hash,
          need_index: 0,
          commitments_hashes: [
            myCommitment.actionHash,
            ...commitmentsForCallToAction.map(c => c.actionHash),
          ],
        });
      }

      // await this.gatherStore.client.addAttendeeForEvent(
      //   this.eventHash,
      //   this.gatherStore.client.client.myPubKey
      // );

      this.dispatchEvent(
        new CustomEvent('attendee-added', {
          bubbles: true,
          composed: true,
          detail: {
            eventHash: this.eventHash,
          },
        })
      );
    } catch (e: any) {
      notifyError(msg('Error adding attendee.'));
      console.error(e);
    }
    this.committing = false;
  }

  renderAttendeesList(
    attendees: ReadonlyMap<AgentPubKey, Profile | undefined>
  ) {
    if (attendees.size === 0)
      return html`<span class="placeholder"
        >${msg('This event has no attendees yet.')}</span
      >`;
    return html`
      <div class="column">
        ${Array.from(attendees.entries()).map(
          ([pubkey, profile]) => html`<div
            class="row"
            style="align-items: center"
          >
            <agent-avatar
              size="40"
              slot="start"
              .agentPubKey=${pubkey}
            ></agent-avatar>
            <span style="margin-left:8px">${profile?.nickname}</span>
          </div>`
        )}
      </div>
    `;
  }

  renderAttendees(
    event: EntryRecord<Event>,
    attendees: ReadonlyMap<AgentPubKey, Profile | undefined>
  ) {
    return html`
      <div class="row" style="align-items: center" slot="header">
        <span class="title" style="margin-right: 8px">${msg('Attendees')}</span>

        <call-to-action-need-progress
          .callToActionHash=${event.entry.call_to_action_hash}
          .needIndex=${0}
          style="width: 150px"
        ></call-to-action-need-progress>
      </div>

      <div class="column">
        ${this.renderAttendeesList(attendees)}
        ${this.renderAttendButton(event, Array.from(attendees.keys()))}
      </div>
    `;
  }

  renderAttendButton(event: EntryRecord<Event>, attendees: AgentPubKey[]) {
    if (
      event.action.author.toString() ===
      this.gatherStore.client.client.myPubKey.toString()
    )
      return html``;
    if (
      attendees
        .map(a => a.toString())
        .includes(this.gatherStore.client.client.myPubKey.toString())
    )
      return html``;
    return html`<sl-button
      variant="primary"
      .loading=${this.committing}
      style="margin-top: 16px;"
      @click=${() => this.attendEvent(event, attendees)}
    >
      ${msg("I'll attend!")}
    </sl-button>`;
  }

  render() {
    switch (this._attendees.value.status) {
      case 'pending':
        return html`<div
          style="display: flex; flex: 1; align-items: center; justify-content: center"
        >
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case 'complete':
        return html`
          <sl-card style="flex: 1; display: flex;">
            ${this.renderAttendees(
              this._attendees.value.value[0],
              this._attendees.value.value[1]
            )}
          </sl-card>
        `;
      case 'error':
        return html`<display-error
          .headline=${msg('Error fetching the attendees for this event')}
          .error=${this._attendees.value.error.data.data}
        ></display-error>`;
    }
  }

  static styles = [sharedStyles];
}
