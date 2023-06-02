import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@scoped-elements/event-calendar';

import { Event } from '@darksoil/gather';

import { Event as EventCalendarEvent } from '@scoped-elements/event-calendar';
import { eventToEventCalendar } from '@darksoil/gather/dist/elements/events-calendar.js';

import { localized, msg } from '@lit/localize';
import { sharedStyles } from '@holochain-open-dev/elements';
import {
  AppAgentClient,
  decodeHashFromBase64,
  DnaHash,
  encodeHashToBase64,
  EntryHash,
} from '@holochain/client';
import { ProfilesClient } from '@holochain-open-dev/profiles';
import { WeServices, weServicesContext } from '@lightningrodlabs/we-applet';
import { consume } from '@lit-labs/context';
import {
  completed,
  join,
  joinAsyncMap,
  lazyLoad,
  mapAndJoin,
  pipe,
  sliceAndJoin,
  StoreSubscriber,
} from '@holochain-open-dev/stores';
import { GatherClient, GatherStore } from '@darksoil/gather';
import { AssembleClient, AssembleStore } from '@darksoil/assemble';
import {
  EntryRecord,
  getCellIdFromRoleName,
  HoloHashMap,
  Hrl,
} from '@holochain-open-dev/utils';

@localized()
@customElement('cross-applet-main')
export class CrossAppletMain extends LitElement {
  @property()
  applets!: ReadonlyMap<
    EntryHash,
    { appletClient: AppAgentClient; profilesClient: ProfilesClient }
  >;

  @consume({ context: weServicesContext, subscribe: true })
  weServices!: WeServices;

  @property()
  allEvents = new StoreSubscriber(
    this,
    () => {
      const gatherStores = Array.from(this.applets.values()).map(
        ({ appletClient }) =>
          new GatherStore(
            new GatherClient(appletClient, 'gather'),
            new AssembleStore(new AssembleClient(appletClient, 'gather'))
          )
      );

      return pipe(
        lazyLoad(async () => {
          const storesByDnaHash: HoloHashMap<DnaHash, GatherStore> =
            new HoloHashMap();

          for (const store of gatherStores) {
            const appInfo = await store.client.client.appInfo();

            const cellId = getCellIdFromRoleName('gather', appInfo);

            storesByDnaHash.set(cellId[0], store);
          }
          return storesByDnaHash;
        }),
        storesByDnaHash => mapAndJoin(storesByDnaHash, store => store.allEvents)
      );
    },
    () => []
  );

  events(): EventCalendarEvent[] {
    if (this.allEvents.value.status !== 'complete') return [];

    const gatherEvents = this.allEvents.value.value;
    let allEvents: EventCalendarEvent[] = [];

    for (const [dnaHash, eventsInOneGather] of Array.from(
      gatherEvents.entries()
    )) {
      const filteredEvents = Array.from(eventsInOneGather.values());
      const events: EventCalendarEvent[] = filteredEvents.map(e => {
        const converted = eventToEventCalendar(e);
        converted.id = `hrl://${encodeHashToBase64(
          dnaHash
        )}${encodeHashToBase64(e.actionHash)}`;
        return converted;
      });

      allEvents = [...allEvents, ...events];
    }
    return allEvents;
  }

  render() {
    return html`
      <event-calendar
        style="flex: 1"
        .events=${this.events()}
        .props=${{ view: 'dayGridMonth' }}
        @event-clicked=${(e: CustomEvent) => {
          const id = e.detail.event.id;
          this.dispatchEvent(
            new CustomEvent('event-selected', {
              bubbles: true,
              composed: true,
              detail: {
                hrl: parseHrl(id),
              },
            })
          );
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

export function parseHrl(s: string): Hrl {
  if (!s.startsWith('hrl://'))
    throw new Error(`Given string ${s} is not an hrl`);

  const split1 = s.split('://');
  const split2 = split1[1].split('/');

  return [decodeHashFromBase64(split2[0]), decodeHashFromBase64(split2[1])];
}
