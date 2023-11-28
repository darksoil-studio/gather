import {
  liveLinksStore,
  deletedLinksStore,
  pipe,
  createLinkToLink,
} from '@holochain-open-dev/stores';

import { AlertsClient, linkToAlert } from './alerts-client.js';

export class AlertsStore<T> {
  constructor(public client: AlertsClient<T>) {}

  unreadAlerts = pipe(
    liveLinksStore(
      this.client,
      this.client.client.myPubKey,
      () => this.client.getUnreadAlerts(),
      'MyAlerts'
    ),
    link => link.map(l => linkToAlert<T>(l))
  );

  readAlerts = pipe(
    deletedLinksStore(
      this.client,
      this.client.client.myPubKey,
      () => this.client.getReadAlerts(),
      'MyAlerts'
    ),
    createLinks =>
      createLinks.map(cl => linkToAlert<T>(createLinkToLink(cl[0])))
  );
}
