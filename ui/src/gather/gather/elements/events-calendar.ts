import { sharedStyles } from '@holochain-open-dev/elements';
import { css, html, LitElement } from 'lit';
import {
  joinAsync,
  sliceAndJoin,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { ActionHash, decodeHashFromBase64 } from '@holochain/client';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { localized } from '@lit/localize';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { Event as EventCalendarEvent } from '@scoped-elements/event-calendar/dist/types.js';
import '@scoped-elements/event-calendar';

import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import './event-summary';
import { eventToEventCalendar, proposalToEventCalendar } from '../utils.js';

@localized()
@customElement('gather-events-calendar')
export class GatherEventsCalendar extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  @property()
  events: ActionHash[] = [];

  @property()
  proposals: ActionHash[] = [];

  _events = new StoreSubscriber(
    this,
    () =>
      joinAsync([
        sliceAndJoin(this.gatherStore.events, this.events),
        sliceAndJoin(this.gatherStore.proposals, this.proposals!),
      ]),
    () => [this.gatherStore, this.events, this.proposals]
  );

  @property()
  view = 'dayGridMonth';

  get formattedevents(): EventCalendarEvent[] {
    if (this._events.value.status !== 'complete') return [];

    const gatherEvents = Array.from(this._events.value.value[0].values());
    const proposals = Array.from(this._events.value.value[1].values());
    const events: EventCalendarEvent[] = gatherEvents.map(e =>
      eventToEventCalendar(e)
    );
    const proposalsEvents: EventCalendarEvent[] = proposals
      .filter(p => !!p.entry.time)
      .map(e => proposalToEventCalendar(e));
    return [...events, ...proposalsEvents];
  }

  render() {
    return html`
      <event-calendar
        style="flex: 1"
        .events=${this.formattedevents}
        .props=${{
          view: this.view,
          eventClick: (info: any) => {
            if (info.event.extendedProps.isProposal) {
              this.dispatchEvent(
                new CustomEvent('proposal-selected', {
                  bubbles: true,
                  composed: true,
                  detail: {
                    proposalHash: decodeHashFromBase64(info.event.id),
                  },
                })
              );
            } else {
              this.dispatchEvent(
                new CustomEvent('event-selected', {
                  bubbles: true,
                  composed: true,
                  detail: {
                    eventHash: decodeHashFromBase64(info.event.id),
                  },
                })
              );
            }
          },
        }}
      ></event-calendar>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex: 1;
      }
    `,
  ];
}
