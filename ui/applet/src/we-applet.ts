import { ProfilesClient, ProfilesStore } from '@holochain-open-dev/profiles';
import {
  AppAgentClient,
  ActionHash,
  EntryHash,
  DnaHash,
} from '@holochain/client';
export interface GroupInfo {
  logo_src: string;
  name: string;
}

export type MainView = (rootElement: HTMLElement) => void;
export type BlockView = (rootElement: HTMLElement, context: any) => void;
export type EntryTypeView = (
  rootElement: HTMLElement,
  hash: EntryHash | ActionHash,
  context: any
) => void;

export interface CrossGroupViews {
  main: MainView;
  blocks: Record<string, BlockView>;
}
export interface EntryInfo {
  name: string;
  icon_src: string;
}

export type Hrl = [DnaHash, ActionHash | EntryHash];

// Contextual reference to a Hrl
// Useful use case: image we want to point to a specific section of a document
// The document action hash would be the Hrl, and the context could be { section: "Second Paragraph" }
export interface HrlWithContext {
  hrl: Hrl;
  context: any;
}

export interface ReferenceableEntryType {
  info: (hash: EntryHash | ActionHash) => Promise<EntryInfo | undefined>;
  view: EntryTypeView;
}

export interface GroupViews {
  main: MainView;
  blocks: Record<string, BlockView>; // all events -> schedule
  entries: Record<
    string,
    Record<string, Record<string, ReferenceableEntryType>>
  >; // Segmented by RoleName, integrity ZomeName and EntryType
}

export interface GroupServices {
  profilesClient: ProfilesClient;
}

export interface AttachableType {
  name: string;
  create: (
    appletClient: AppAgentClient,
    attachToHrl: Hrl
  ) => Promise<HrlWithContext>;
}

export interface GroupWithApplets {
  groupServices: GroupServices;
  appletsClients: AppAgentClient[]; // These will be the same kind of applet
}

export interface OpenViews {
  openGroupBlock(block: string, context: any): void;
  openCrossGroupBlock(block: string, context: any): void;
  openHrl(hrl: Hrl, context: any): void;
}

export interface WeServices {
  openViews: OpenViews;
  info(hrl: Hrl): Promise<EntryInfo>;
}

export interface WeApplet {
  groupViews: (
    appletClient: AppAgentClient,
    groupServices: GroupServices,
    weServices: WeServices
  ) => GroupViews;

  attachableTypes: Array<AttachableType>;
  search: (
    appletClient: AppAgentClient,
    searchFilter: string
  ) => Promise<Array<HrlWithContext>>;

  crossGroupViews: (
    applets: GroupWithApplets[],
    weServices: WeServices
  ) => CrossGroupViews;
}
