import {
  hashProperty,
  notifyError,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { EntryRecord } from '@holochain-open-dev/utils';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { LitElement, html } from 'lit';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { customElement, property, state } from 'lit/decorators.js';

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

import '@darksoil/assemble/elements/call-to-action-detail.js';
//@ts-ignore
import { CallToActionDetail } from '@darksoil/assemble/elements/call-to-action-detail.js';

import './attendees-for-event.js';
import './edit-event.js';

//@ts-ignore
@localized()
//@ts-ignore
@customElement('event-proposal-detail')
export class EventProposalDetail extends CallToActionDetail {}
