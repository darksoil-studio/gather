import {
  EntryHash,
  DnaHash,
  AppAgentClient,
  CellType,
} from '@holochain/client';
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
import { msg } from '@lit/localize';

import { AssembleClient, AssembleStore } from '@darksoil/assemble';
import { mdiCalendar } from '@mdi/js';
import {
  wrapPathInSvg,
  wrapPathInSvgWithoutPrefix,
} from '@holochain-open-dev/elements';
import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';

import {
  AttachmentsClient,
  AttachmentsStore,
} from '@lightningrodlabs/attachments';
import {
  AppletClients,
  AppletViews,
  CrossAppletViews,
  Hrl,
  WeApplet,
  WeServices,
} from '@lightningrodlabs/we-applet';

import '@lightningrodlabs/we-applet/dist/elements/we-services-context.js';
import '@lightningrodlabs/attachments/dist/elements/attachments-context.js';
import '@lightningrodlabs/attachments/dist/elements/attachments-card.js';
import '@lightningrodlabs/we-applet/dist/elements/share-hrl.js';

import './applet-main';
import './cross-applet-main';

function wrapAppletView(
  client: AppAgentClient,
  profilesClient: ProfilesClient,
  weServices: WeServices,
  innerTemplate: TemplateResult
): TemplateResult {
  const assembleStore = new AssembleStore(new AssembleClient(client, 'gather'));
  const gatherStore = new GatherStore(
    new GatherClient(client, 'gather'),
    assembleStore
  );
  const fileStorageClient = new FileStorageClient(client, 'gather');
  return html` <attachments-context
    .store=${new AttachmentsStore(new AttachmentsClient(client, 'gather'))}
  >
    <we-services-context .services=${weServices}>
      <file-storage-context .client=${fileStorageClient}>
        <profiles-context .store=${new ProfilesStore(profilesClient)}>
          <gather-context .store=${gatherStore}>
            ${innerTemplate}
          </gather-context></profiles-context
        ></file-storage-context
      ></we-services-context
    ></attachments-context
  >`;
}

async function appletViews(
  client: AppAgentClient,
  _appletId: EntryHash,
  profilesClient: ProfilesClient,
  weServices: WeServices
): Promise<AppletViews> {
  return {
    main: element =>
      render(
        wrapAppletView(
          client,
          profilesClient,
          weServices,
          html`
            <applet-main
              @event-created=${async (e: CustomEvent) => {
                const appInfo = await client.appInfo();
                const dnaHash = (appInfo.cell_info.gather[0] as any)[
                  CellType.Provisioned
                ].cell_id[0];
                weServices.openViews.openHrl([dnaHash, e.detail.eventHash], {});
              }}
              @event-selected=${async (e: CustomEvent) => {
                const appInfo = await client.appInfo();
                const dnaHash = (appInfo.cell_info.gather[0] as any)[
                  CellType.Provisioned
                ].cell_id[0];
                weServices.openViews.openHrl([dnaHash, e.detail.eventHash], {});
              }}
            ></applet-main>
          `
        ),
        element
      ),
    blocks: {
      calendar: {
        label: msg('Calendar'),
        icon_src: wrapPathInSvgWithoutPrefix(mdiCalendar),
        view(element, context) {
          render(
            wrapAppletView(
              client,
              profilesClient,
              weServices,
              html`
                <gather-events-calendar
                  @event-selected=${async (e: CustomEvent) => {
                    const appInfo = await client.appInfo();
                    const dnaHash = (appInfo.cell_info.gather[0] as any)[
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
          );
        },
      },
    },
    entries: {
      gather: {
        gather: {
          event: {
            info: async (hrl: Hrl) => {
              const gatherClient = new GatherClient(client, 'gather');
              const record = await gatherClient.getEvent(hrl[1]);

              if (!record) return undefined;

              return {
                name: record.event.entry.title,
                icon_src: wrapPathInSvg(mdiCalendar),
              };
            },
            view: (element, hrl: Hrl, context) =>
              render(
                wrapAppletView(
                  client,
                  profilesClient,
                  weServices,
                  html`
                    <event-detail
                      .eventHash=${hrl[1]}
                      style="flex: 1; margin: 16px"
                    >
                      <share-hrl
                        .hrl=${hrl}
                        slot="action"
                        style="margin-left: 8px"
                      ></share-hrl>
                      <attachments-card
                        .hash=${hrl[1]}
                        slot="attachments"
                      ></attachments-card>
                    </event-detail>
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

async function crossAppletViews(
  applets: ReadonlyMap<EntryHash, AppletClients>,
  weServices: WeServices
): Promise<CrossAppletViews> {
  console.log(applets);
  return {
    main: element =>
      render(
        html` <cross-applet-main .applets=${applets}></cross-applet-main> `,
        element
      ),
    blocks: {},
  };
}

const applet: WeApplet = {
  appletViews,
  crossAppletViews,
  attachmentTypes: async client => ({}),
  search: async (appletClient, _appletId, _weServices, searchFilter) => {
    const client = new GatherClient(appletClient, 'gather');

    const eventsHashes = await client.getAllEvents();
    const events = await Promise.all(
      eventsHashes.map(hash => client.getEvent(hash))
    );

    const filteredEvents = events
      .filter(e => !!e && e.event.entry.title.includes(searchFilter))
      .map(e => e!.event.actionHash);

    const appInfo = await appletClient.appInfo();
    const dnaHash = (appInfo.cell_info.gather[0] as any)[CellType.Provisioned]
      .cell_id[0];

    return filteredEvents.map(hash => ({ hrl: [dnaHash, hash], context: {} }));
  },
};

export default applet;
