import { CallToAction } from '@darksoil/assemble';
import { EntryRecord } from '@holochain-open-dev/utils';
import { encodeHashToBase64 } from '@holochain/client';
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
