import { ActionHash, AppAgentClient, CellType } from '@holochain/client';
import { html, render, TemplateResult } from 'lit';
import { GatherStore, GatherClient } from '@darksoil/gather';
import '@darksoil/gather/elements/gather-context.js';
import '@darksoil/gather/elements/all-events.js';
import '@darksoil/gather/elements/event-detail.js';
import '@darksoil/gather/elements/events-calendar.js';
import { FileStorageClient } from '@holochain-open-dev/file-storage';
import '@holochain-open-dev/profiles/elements/profiles-context.js';
import '@holochain-open-dev/file-storage/elements/file-storage-context.js';

import {
  CrossGroupViews,
  GroupInfo,
  GroupServices,
  GroupViews,
  GroupWithApplets,
  OpenViews,
  WeApplet,
  WeServices,
} from './we-applet';
import './gather-applet-main';

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
  weServices: WeServices
): GroupViews {
  return {
    blocks: {
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
                  weServices.openViews.openHrl(
                    [dnaHash, e.detail.eventHash],
                    {}
                  );
                }}
              ></gather-applet-main>
            `
          ),
          element
        ),
      calendar: element =>
        render(
          wrapGroupView(
            client,
            groupInfo,
            groupServices,
            html`
              <gather-events-calendar
                @event-selected=${async (e: CustomEvent) => {
                  const appInfo = await client.appInfo();
                  const dnaHash = (appInfo.cell_info['gather'][0] as any)[
                    CellType.Provisioned
                  ].cell_id[0];
                  weServices.openViews.openHrl(
                    [dnaHash, e.detail.eventHash],
                    {}
                  );
                }}
              ></gather-events-calendar>
            `
          ),
          element
        ),
    },
    entries: {
      gather: {
        gather_integrity: {
          event: {
            name: async (hash: ActionHash) => '',
            view: (element, hash: ActionHash, context) =>
              render(
                wrapGroupView(
                  client,
                  groupInfo,
                  groupServices,
                  html` <event-detail .eventHash=${hash}></event-detail> `
                ),
                element
              ),
          },
        },
      },
      assemble_integrity: {},
    },
  };
}

function crossGroupViews(
  groupWithApplets: GroupWithApplets[]
): CrossGroupViews {
  return {
    blocks: {
      main: element => {},
    },
  };
}

const applet: WeApplet = {
  attachableTypes: [],
  search: async () => [],
  groupViews,
  crossGroupViews,
};

export default applet;

// function wrapAssembleGroupView(
//   client: AppAgentClient,
//   groupInfo: GroupInfo,
//   groupServices: GroupServices,
//   innerTemplate: TemplateResult
// ): TemplateResult {
//   const assembleStore = new AssembleStore(
//     new AssembleClient(client, 'assemble')
//   );
//   return wrapGroupView(
//     client,
//     groupInfo,
//     groupServices,
//     html`<assemble-context .store=${assembleStore}>
//       ${innerTemplate}
//     </assemble-context>`
//   );
// }
