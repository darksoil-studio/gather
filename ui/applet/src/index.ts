import { ActionHash, AppAgentClient, CellType } from '@holochain/client';
import { html, render, TemplateResult } from 'lit';
import {
  GatherStore,
  GatherClient,
  GatherContext,
  EventDetail,
} from '@darksoil/gather';
import { ProfilesContext } from '@holochain-open-dev/profiles';
import { FileStorageClient } from '@holochain-open-dev/file-storage';
import '@holochain-open-dev/file-storage/file-storage-context';

import {
  CrossGroupViews,
  GroupInfo,
  GroupServices,
  GroupViews,
  GroupWithApplets,
  OpenViews,
  WeApplet,
} from './we-applet';
import { GatherAppletMain } from './gather-applet-main';

customElements.define('gather-context', GatherContext);
customElements.define('gather-applet-main', GatherAppletMain);
customElements.define('event-detail', EventDetail);
customElements.define('profiles-context', ProfilesContext);

function wrapGroupView(
  client: AppAgentClient,
  groupInfo: GroupInfo,
  groupServices: GroupServices,
  innerTemplate: TemplateResult
): TemplateResult {
  const gatherStore = new GatherStore(new GatherClient(client, 'gather'));
  const fileStorageClient = new FileStorageClient(client, 'gather');
  return html` <file-storage-context .client=${fileStorageClient}>
    <profiles-context .store=${groupServices.profilesStore}>
      <gather-context .store=${gatherStore}>
        ${innerTemplate}</gather-context
      ></profiles-context
    ></file-storage-context
  >`;
}

function groupViews(
  client: AppAgentClient,
  groupInfo: GroupInfo,
  groupServices: GroupServices,
  openViews: OpenViews
): GroupViews {
  return {
    blocks: {},
    main: element =>
      render(
        wrapGroupView(
          client,
          groupInfo,
          groupServices,
          html`
            <gather-applet-main
              @event-selected=${async (e: CustomEvent) => {
                const appInfo = await client.appInfo();
                const dnaHash = (appInfo.cell_info['gather'][0] as any)[
                  CellType.Provisioned
                ].cell_id[0];
                openViews.openHrl([dnaHash, e.detail.eventHash], {}, 'NewTab');
              }}
            ></gather-applet-main>
          `
        ),
        element
      ),
    entries: {
      gather: {
        gather: {
          event: (hash: ActionHash, context) => ({
            name: async () => '',
            view: element =>
              render(
                wrapGroupView(
                  client,
                  groupInfo,
                  groupServices,
                  html` <event-detail .eventHash=${hash}></event-detail> `
                ),
                element
              ),
          }),
        },
      },
    },
  };
}

function crossGroupViews(
  groupWithApplets: GroupWithApplets[]
): CrossGroupViews {
  return {
    blocks: {},
    main: element => {},
  };
}

const applet: WeApplet = {
  attachableTypes: [],
  search: async () => [],
  groupViews,
  crossGroupViews,
};

export default applet;
