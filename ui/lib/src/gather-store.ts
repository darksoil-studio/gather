import { lazyLoadAndPoll } from '@holochain-open-dev/stores';
import { EntryRecord, LazyHoloHashMap } from '@holochain-open-dev/utils';
import { ActionHash, AgentPubKey } from '@holochain/client';

import { GatherClient } from './gather-client';
import { Event } from './types';

export class GatherStore {
  constructor(public client: GatherClient) {}

  /** Event */

  events = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(async () => this.client.getEvent(eventHash), 4000)
  );

  /** Attendees for Event */

  attendeesForEvent = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(
      async () => this.client.getAttendeesForEvent(eventHash),
      4000
    )
  );

  eventsForAttendee = new LazyHoloHashMap((agent: AgentPubKey) =>
    lazyLoadAndPoll(async () => this.client.getEventsForAttendee(agent), 4000)
  );

  /** All events */
  allEvents = lazyLoadAndPoll(async () => this.client.getAllEvents(), 4000);

  /** Events By Author */

  eventsByAuthor = new LazyHoloHashMap((author: AgentPubKey) =>
    lazyLoadAndPoll(async () => {
      const records = await this.client.getEventsByAuthor(author);
      return records.map(r => r.actionHash);
    }, 4000)
  );
}
