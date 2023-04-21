import { sharedStyles } from '@holochain-open-dev/elements';
import { css, html, LitElement } from 'lit';
import {
  asyncDeriveStore,
  joinAsyncMap,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { localized } from '@lit/localize';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { Event as EventCalendarEvent } from '@scoped-elements/event-calendar';
import '@scoped-elements/event-calendar';

import { Event } from '../types.js';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import './event-summary';
import { EntryRecord, slice } from '@holochain-open-dev/utils';

export function eventToEventCalendar(
  gatherEvent: EntryRecord<Event>
): EventCalendarEvent {
  return {
    id: encodeHashToBase64(gatherEvent.actionHash),
    title: gatherEvent.entry.title,
    allDay: false,
    backgroundColor: 'blue',
    extendedProps: {},
    resourceIds: [],
    display: 'auto',
    durationEditable: false,
    editable: false,
    startEditable: false,
    start: new Date(Math.floor(gatherEvent.entry.start_time / 1000)),
    end: new Date(Math.floor(gatherEvent.entry.end_time / 1000)),
  };
}

@localized()
@customElement('gather-events-calendar')
export class GatherEventsCalendar extends LitElement {
  @consume({ context: gatherStoreContext, subscribe: true })
  gatherStore!: GatherStore;

  _allEvents = new StoreSubscriber(this, () =>
    asyncDeriveStore(this.gatherStore.allEvents, allEventsHashes =>
      joinAsyncMap(slice(this.gatherStore.events, allEventsHashes))
    )
  );

  events(): EventCalendarEvent[] {
    if (this._allEvents.value.status !== 'complete') return [];

    const gatherEvents = this._allEvents.value.value;
    const filteredEvents = Array.from(gatherEvents.values()).filter(
      e => !!e
    ) as Array<EntryRecord<Event>>;
    const events: EventCalendarEvent[] =
      filteredEvents.map(eventToEventCalendar);
    return events;
  }

  render() {
    return html`
      <event-calendar
        style="flex: 1"
        .events=${this.events()}
        .props=${{ view: 'dayGridMonth' }}
        @event-clicked=${(e: CustomEvent) =>
          this.dispatchEvent(
            new CustomEvent('event-selected', {
              bubbles: true,
              composed: true,
              detail: {
                eventHash: decodeHashFromBase64(e.detail.event.id),
              },
            })
          )}
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
