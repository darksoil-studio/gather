import { lazyLoadAndPoll, pipe } from '@holochain-open-dev/stores';
import { deletedLinksStore, liveLinksStore } from '../gather/gather/stores.js';

import { AlertsClient, createLinkToAlert } from './alerts-client.js';

export class AlertsStore<T> {
  constructor(public client: AlertsClient<T>) {}

  unreadAlerts = pipe(
    liveLinksStore(
      this.client,
      this.client.client.myPubKey,
      () => this.client.getUnreadAlerts(),
      'MyAlerts'
    ),
    createLinks => createLinks.map(cl => createLinkToAlert<T>(cl))
  );

  readAlerts = pipe(
    deletedLinksStore(
      this.client,
      this.client.client.myPubKey,
      () => this.client.getReadAlerts(),
      'MyAlerts'
    ),
    createLinks => createLinks.map(cl => createLinkToAlert<T>(cl[0]))
  );
}
