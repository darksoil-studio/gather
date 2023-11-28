import { ZomeClient } from '@holochain-open-dev/utils';
import {
  ActionHash,
  AgentPubKey,
  AppAgentClient,
  CreateLink,
  DeleteLink,
  Link,
  SignedActionHashed,
} from '@holochain/client';
import { encode, decode } from '@msgpack/msgpack';
import { AlertsSignal } from './types.js';

export class AlertsClient<T> extends ZomeClient<AlertsSignal> {
  constructor(
    public client: AppAgentClient,
    public roleName: string,
    public zomeName = 'alerts'
  ) {
    super(client, roleName, zomeName);
  }
  /** Alerts */

  async getUnreadAlerts(): Promise<Array<Link>> {
    return this.callZome('get_unread_alerts', null);
  }

  async getReadAlerts(): Promise<
    Array<
      [SignedActionHashed<CreateLink>, Array<SignedActionHashed<DeleteLink>>]
    >
  > {
    return this.callZome('get_read_alerts', null);
  }

  async markAlertsAsRead(actionHashes: ActionHash[]): Promise<void> {
    await this.callZome('mark_alerts_as_read', actionHashes);
  }

  notifyAlert(
    agents: AgentPubKey[],
    alert: T
  ): Promise<Array<SignedActionHashed<CreateLink>>> {
    const alertBinary = encode(alert);
    return this.callZome('notify_alert', {
      agents,
      alert: alertBinary,
    });
  }
}
export function linkToAlert<T>(link: Link): Alert<T> {
  return {
    link,
    alert: decode(link.tag) as T,
    timestamp: link.timestamp,
  };
}

export interface Alert<T> {
  link: Link;
  timestamp: number;
  alert: T;
}
