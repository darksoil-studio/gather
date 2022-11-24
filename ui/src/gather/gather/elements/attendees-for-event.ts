import { hashProperty } from '@holochain-open-dev/elements';
import {
  AgentAvatar,
  Profile,
  ProfilesStore,
  profilesStoreContext,
} from '@holochain-open-dev/profiles';
import { AgentPubKeyMap } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppWebsocket,
  EntryHash,
  InstalledAppInfo,
  InstalledCell,
  Record,
} from '@holochain/client';
import { contextProvided } from '@lit-labs/context';
import { TaskStatus } from '@lit-labs/task';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  Card,
  CircularProgress,
  List,
  ListItem,
} from '@scoped-elements/material-web';
import { LitElement, html } from 'lit';
import { TaskSubscriber } from 'lit-svelte-stores';
import { customElement, property, state } from 'lit/decorators.js';
import { readable } from 'svelte/store';

import { sharedStyles } from '../../../shared-styles';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';

export class AttendeesForEvent extends ScopedElementsMixin(LitElement) {
  @property(hashProperty('event-hash'))
  eventHash!: ActionHash;

  @contextProvided({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @contextProvided({ context: profilesStoreContext, subscribe: true })
  profilesStore!: ProfilesStore;

  _fetchAttendees = new TaskSubscriber(
    this,
    ([store, eventHash]) => store.fetchAttendeesForEvent(eventHash),
    () => [this.gatherStore, this.eventHash] as [GatherStore, ActionHash]
  );

  _fetchProfiles = new TaskSubscriber(
    this,
    async ([s]) => {
      if (s !== TaskStatus.COMPLETE)
        return readable(new AgentPubKeyMap<Profile>());
      return this.profilesStore.fetchAgentsProfiles(
        this._fetchAttendees.value!
      );
    },
    () => [this._fetchAttendees.status]
  );

  renderList(hashes: Array<AgentPubKey>) {
    if (hashes.length === 0)
      return html`<span style="margin: 16px"
        >This event has no attendees yet</span
      >`;
    return this._fetchProfiles.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: profiles => html`
        <mwc-list style="display: flex; flex-direction: column">
          ${hashes.map(
            pubkey => html`<mwc-list-item graphic="avatar" noninteractive>
              <agent-avatar
                size="40"
                slot="graphic"
                .agentPubKey=${pubkey}
              ></agent-avatar>
              <span>${profiles.get(pubkey)?.nickname}</span>
            </mwc-list-item>`
          )}
        </mwc-list>
      `,
      error: (e: any) =>
        html`<span>Error fetching the attendees: ${e.data.data}.</span>`,
    });
  }

  render() {
    return this._fetchAttendees.render({
      pending: () => html`<div
        style="display: flex; flex: 1; align-items: center; justify-content: center"
      >
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`,
      complete: hashes => html`
        <mwc-card style="flex: 1; display: flex;">
          <div class="column">
            <span
              class="title"
              style="margin-left: 16px; margin-top: 16px; margin-bottom: 8px"
              >Attendees</span
            >
            ${this.renderList(hashes)}
          </div>
        </mwc-card>
      `,
      error: (e: any) =>
        html`<span>Error fetching the attendees: ${e.data.data}.</span>`,
    });
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'agent-avatar': AgentAvatar,
      'mwc-list': List,
      'mwc-list-item': ListItem,
      'mwc-card': Card,
    };
  }

  static styles = [sharedStyles];
}
