import { ProfilesStore } from "@holochain-open-dev/profiles";
import {
  AppAgentClient,
  ActionHash,
  EntryHash,
  DnaHash,
} from "@holochain/client";

export interface GroupInfo {
  logo_src: string;
  name: string;
}

export type ViewLocation = "NewTab" | "NewBlock";

export interface OpenViews {
  openMain(viewLocation: ViewLocation): void;
  openBlock(blockName: string, viewLocation: ViewLocation): void;
  openHrl(hrl: Hrl, context: any, viewLocation: ViewLocation): void;
}

export type View = (rootElement: HTMLElement) => void;

export type EntryTypeView = (
  hash: EntryHash | ActionHash,
  context: any
) => Promise<{
  name: string;
  view: View;
}>;

export interface CrossGroupViews {
  main: View;
  blocks: Record<string, View>;
}

export interface GroupViews {
  main: View;
  blocks: Record<string, View>; // all events -> schedule
  entries: Record<string, Record<string, Record<string, EntryTypeView>>>; // Segmented by RoleName, integrity ZomeName and EntryType
}

export interface GroupServices {
  profilesStore: ProfilesStore;
}

export type Hrl = [DnaHash, ActionHash | EntryHash];

// Contextual reference to a Hrl
// Useful use case: image we want to point to a specific section of a document
// The document action hash would be the Hrl, and the context could be { secion: "Second Paragraph" }
export interface HrlWithContext {
  hrl: Hrl;
  context: any;
}

export interface AttachableType {
  name: string;
  create: (
    appletClient: AppAgentClient,
    attachToHrl: Hrl
  ) => Promise<HrlWithContext>;
}

export interface GroupWithApplets {
  groupInfo: GroupInfo;
  groupServices: GroupServices;
  appletsClients: AppAgentClient[]; // These will be the same kind of applet
}

export interface WeApplet {
  groupViews: (
    appletClient: AppAgentClient,
    groupInfo: GroupInfo,
    groupServices: GroupServices,
    openViews: OpenViews
  ) => GroupViews;

  attachableTypes: Array<AttachableType>;
  search: (
    appletClient: AppAgentClient,
    searchFilter: string
  ) => Promise<Array<HrlWithContext>>;

  crossGroupViews: (
    applets: GroupWithApplets[],
    openViews: OpenViews
  ) => CrossGroupViews;
}