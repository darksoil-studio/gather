import { CallToAction } from '@darksoil/assemble';
import { EntryRecord } from '@holochain-open-dev/utils';
import {
  AppAgentCallZomeRequest,
  AppAgentWebsocket,
  CallZomeRequest,
  encodeHashToBase64,
  HoloHash,
} from '@holochain/client';
import { Event as EventCalendarEvent } from '@scoped-elements/event-calendar/dist/types.js';
import { Event } from './types.js';

export function isExpired(callToAction: CallToAction) {
  return (
    callToAction.expiration_time &&
    callToAction.expiration_time < Date.now() * 1000
  );
}

export function isPast(event: Event) {
  return event.start_time < Date.now() * 1000;
}

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

export const MOBILE_WIDTH_PX = 600;

export function intersection(
  array1: HoloHash[],
  array2: HoloHash[]
): Array<HoloHash> {
  return array1.filter(
    hash => !!array2.find(h => h.toString() === hash.toString())
  );
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
