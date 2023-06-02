import { sharedStyles } from '@holochain-open-dev/elements';
import { css, html, LitElement } from 'lit';
import {
  asyncDeriveStore,
  joinAsyncMap,
  sliceAndJoin,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit-labs/context';
import { localized } from '@lit/localize';

import '@holochain-open-dev/elements/dist/elements/display-error.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import { Event as EventCalendarEvent } from '@scoped-elements/event-calendar';
import { EntryRecord } from '@holochain-open-dev/utils';
import '@scoped-elements/event-calendar';

import { Event } from '../types.js';
import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';
import './event-summary';

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

  @property()
  allEvents = new StoreSubscriber(
    this,
    () => this.gatherStore.allEvents,
    () => [this.gatherStore]
  );

  events(): EventCalendarEvent[] {
    if (this.allEvents.value.status !== 'complete') return [];

    const gatherEvents = this.allEvents.value.value;
    const filteredEvents = Array.from(gatherEvents.values());
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
