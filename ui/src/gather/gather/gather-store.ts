import { lazyLoadAndPoll } from "@holochain-open-dev/stores";
import { EntryRecord, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { ActionHash, AgentPubKey } from "@holochain/client";

import { GatherClient } from "./gather-client";
import { Event } from "./types";

export class GatherStore {
  constructor(public client: GatherClient) {}

  /** Event */

  events = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(async () => {
      const record = await this.client.getEvent(eventHash);
      return record ? new EntryRecord<Event>(record) : undefined;
    }, 200)
  );

  /** Attendees for Event */

  attendeesForEvent = new LazyHoloHashMap((eventHash: ActionHash) =>
    lazyLoadAndPoll(
      async () => this.client.getAttendeesForEvent(eventHash),
      1000
    )
  );

  eventsForAttendee = new LazyHoloHashMap((agent: AgentPubKey) =>
    lazyLoadAndPoll(async () => this.client.getEventsForAttendee(agent), 1000)
  );

  /** All events */
  allEvents = lazyLoadAndPoll(async () => this.client.getAllEvents(), 1000);
}
