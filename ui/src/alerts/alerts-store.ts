import { lazyLoadAndPoll } from '@holochain-open-dev/stores';

import { AlertsClient } from './alerts-client.js';

export class AlertsStore<T> {
  constructor(public client: AlertsClient<T>) {}

  unreadAlerts = lazyLoadAndPoll(() => this.client.getUnreadAlerts(), 4000);

  readAlerts = lazyLoadAndPoll(() => this.client.getReadAlerts(), 4000);
}
