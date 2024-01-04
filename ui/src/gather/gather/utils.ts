import { CallToAction } from '@darksoil/assemble';
import {
  AsyncReadable,
  joinAsync,
  pipe,
  Readable,
} from '@holochain-open-dev/stores';
import {
  EntryRecord,
  HoloHashMap,
  Hrl,
  mapValues,
  parseHrl,
} from '@holochain-open-dev/utils';
import {
  AppAgentWebsocket,
  CallZomeRequest,
  decodeHashFromBase64,
  encodeHashToBase64,
  HoloHash,
} from '@holochain/client';
import { Event as EventCalendarEvent } from '@scoped-elements/event-calendar/dist/types.js';
import { cloneDeepWith } from 'lodash-es';
import { Event, Proposal } from './types.js';

export function isExpired(callToAction: CallToAction) {
  return (
    callToAction.expiration_time &&
    callToAction.expiration_time < Date.now() * 1000
  );
}

export function isPast(event: Event) {
  return event.time.start_time < Date.now() * 1000;
}

export function eventToEventCalendar(
  gatherEvent: EntryRecord<Event>
): EventCalendarEvent {
  return {
    id: encodeHashToBase64(gatherEvent.actionHash),
    title: gatherEvent.entry.title,
    allDay: false,
    backgroundColor: 'blue',
    extendedProps: {
      isProposal: false,
    },
    resourceIds: [],
    display: 'auto',
    durationEditable: false,
    editable: false,
    startEditable: false,
    start: new Date(Math.floor(gatherEvent.entry.time.start_time / 1000)),
    end: new Date(Math.floor((gatherEvent.entry.time as any).end_time / 1000)),
  };
}

export function proposalToEventCalendar(
  proposal: EntryRecord<Proposal>
): EventCalendarEvent {
  return {
    id: encodeHashToBase64(proposal.actionHash),
    title: proposal.entry.title,
    allDay: false,
    backgroundColor: 'white',
    extendedProps: {
      isProposal: true,
    },
    resourceIds: [],
    display: 'auto',
    durationEditable: false,
    editable: false,
    startEditable: false,
    start: new Date(Math.floor(proposal.entry.time!.start_time / 1000)),
    end: new Date(Math.floor((proposal.entry.time as any).end_time / 1000)),
  };
}

export const MOBILE_WIDTH_PX = 600;

export function intersection(
  array1: HoloHash[],
  array2: HoloHash[]
): Array<HoloHash> {
  return array1.filter(
    hash => !!array2.find(h => h.toString() === hash.toString())
  );
}

export function uniquify(array: Array<HoloHash>): Array<HoloHash> {
  const strArray = array.map(h => encodeHashToBase64(h));
  const uniqueArray = [...new Set(strArray)];
  return uniqueArray.map(h => decodeHashFromBase64(h));
}

export function installLogger(appAgentWebsocket: AppAgentWebsocket) {
  const nativeCallZome = appAgentWebsocket.appWebsocket.callZome;
  // eslint-disable-next-line
  appAgentWebsocket.appWebsocket.callZome = async (
    request: CallZomeRequest,
    timeout?: number
  ) => {
    console.log('Request', request);
    const result = await nativeCallZome(request, timeout);
    console.log('Request result', request, result);
    return result;
  };
}

export function deepJoinAsync<T>(object: T) {
  const stores: Array<AsyncReadable<any>> = [];
  cloneDeepWith(object, value => {
    if ('subscribe' in value) {
      stores.push(value);
      return stores.length - 1;
    }
  });
  return pipe(joinAsync(stores), values => {
    return cloneDeepWith(object, value => {
      if ('subscribe' in value) {
        const storeIndex = stores.findIndex(s => value === s);
        if (storeIndex !== -1) {
          return values[storeIndex];
        }
      }
    });
  });
}

export type AsyncStoreValue<T> = T extends AsyncReadable<infer U> ? U : never;

export function joinAsyncValues<
  T extends Record<string, AsyncReadable<any> | unknown>
>(object: T) {
  const stores: Array<AsyncReadable<unknown>> = [];
  for (const [key, value] of Object.entries(object)) {
    if ('subscribe' in (value as AsyncReadable<unknown>)) {
      stores.push(value as AsyncReadable<unknown>);
    }
  }
  return pipe(joinAsync(stores), values => {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if ('subscribe' in (value as AsyncReadable<unknown>)) {
        const storeIndex = stores.findIndex(s => value === s);
        if (storeIndex !== -1) {
          obj[key] = values[storeIndex] as AsyncStoreValue<typeof value>;
        }
      } else {
        obj[key] = value;
      }
    }
    return obj;
  });
}

export function getHrlToRender(): Hrl | undefined {
  if (window.location.search.length === 0) return undefined;
  const queryString = window.location.search.slice(1);
  return queryStringToRenderView(queryString);
}

export function queryStringToRenderView(s: string): Hrl | undefined {
  const args = s.split('&');

  const hrlArg = args.find(arg => arg.startsWith('hrl='));

  if (!hrlArg) return undefined;

  const hrl = hrlArg.split('hrl=')[1];

  return parseHrl(hrl);
}
