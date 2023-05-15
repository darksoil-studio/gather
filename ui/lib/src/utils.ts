import { CallToAction } from '@darksoil/assemble';
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
