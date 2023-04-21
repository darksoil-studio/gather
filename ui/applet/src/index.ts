import { ActionHash, AppAgentClient, CellType } from '@holochain/client';
import { html, render, TemplateResult } from 'lit';
import { GatherStore, GatherClient } from '@darksoil/gather';
import '@darksoil/gather/dist/elements/gather-context.js';
import '@darksoil/gather/dist/elements/all-events.js';
import '@darksoil/gather/dist/elements/event-detail.js';
import '@darksoil/gather/dist/elements/events-calendar.js';
import '@darksoil/gather/dist/elements/event-proposal-detail.js';
import '@darksoil/assemble/dist/elements/assemble-context.js';
import { FileStorageClient } from '@holochain-open-dev/file-storage';
import '@holochain-open-dev/profiles/dist/elements/profiles-context.js';
import '@holochain-open-dev/file-storage/dist/elements/file-storage-context.js';

import {
  CrossGroupViews,
  GroupInfo,
  GroupServices,
  GroupViews,
  GroupWithApplets,
  WeApplet,
  WeServices,
} from './we-applet';
import './gather-applet-main';
import { AssembleClient, AssembleStore } from '@darksoil/assemble';
import { mdiCalendar } from '@mdi/js';
import { wrapPathInSvg } from '@holochain-open-dev/elements';

function wrapGroupView(
  client: AppAgentClient,
  groupInfo: GroupInfo,
  groupServices: GroupServices,
  innerTemplate: TemplateResult
): TemplateResult {
  const gatherStore = new GatherStore(new GatherClient(client, 'gather'));
  const fileStorageClient = new FileStorageClient(client, 'gather');
  const assembleStore = new AssembleStore(new AssembleClient(client, 'gather'));
  return html` <file-storage-context .client=${fileStorageClient}>
    <profiles-context .store=${groupServices.profilesStore}>
      <gather-context .store=${gatherStore}>
        <assemble-context .store=${assembleStore}>
          ${innerTemplate}
        </assemble-context>
      </gather-context></profiles-context
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
                weServices.openViews.openHrl([dnaHash, e.detail.eventHash], {});
              }}
              @call-to-action-created=${async (e: CustomEvent) => {
                const appInfo = await client.appInfo();
                const dnaHash = (appInfo.cell_info['gather'][0] as any)[
                  CellType.Provisioned
                ].cell_id[0];
                weServices.openViews.openHrl(
                  [dnaHash, e.detail.callToActionHash],
                  {}
                );
              }}
              @event-proposal-selected=${async (e: CustomEvent) => {
                const appInfo = await client.appInfo();
                const dnaHash = (appInfo.cell_info['gather'][0] as any)[
                  CellType.Provisioned
                ].cell_id[0];
                weServices.openViews.openHrl(
                  [dnaHash, e.detail.eventProposalHash],
                  {}
                );
              }}
            ></gather-applet-main>
          `
        ),
        element
      ),
    blocks: {},
    entries: {
      gather: {
        gather: {
          event: {
            info: async (hash: ActionHash) => {
              const gatherClient = new GatherClient(client, 'gather');
              const record = await gatherClient.getEvent(hash);

              if (!record) return undefined;

              return {
                name: record.entry.title,
                icon_src: wrapPathInSvg(mdiCalendar),
              };
            },
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
        assemble: {
          call_to_action: {
            info: async (hash: ActionHash) => undefined,
            view: (element, hash: ActionHash, context) =>
              render(
                wrapGroupView(
                  client,
                  groupInfo,
                  groupServices,
                  html`
                    <event-proposal-detail
                      .callToActionHash=${hash}
                    ></event-proposal-detail>
                  `
                ),
                element
              ),
          },
        },
      },
    },
  };
}

function crossGroupViews(
  groupWithApplets: GroupWithApplets[]
): CrossGroupViews {
  return {
    main: element => {},
    blocks: {},
  };
}

const applet: WeApplet = {
  attachableTypes: [],
  search: async () => [],
  groupViews,
  crossGroupViews,
};

export default applet;
