import { AppAgentClient } from "@holochain/client";
import { html, render } from "lit";
import { AllEvents, GatherStore, GatherClient } from "@darksoil/gather";
import {
  CrossGroupViews,
  GroupInfo,
  GroupServices,
  GroupViews,
  GroupWithApplets,
  WeApplet,
} from "./we-applet";

customElements.define("all-events", AllEvents);

function groupViews(
  client: AppAgentClient,
  groupInfo: GroupInfo,
  groupServices: GroupServices
): GroupViews {
  const gatherStore = new GatherStore(new GatherClient(client, "gather"));
  return {
    blocks: {},
    entries: {},
    main: (element) =>
      render(
        html`<all-events .gatherStore=${gatherStore}></all-events>`,
        element
      ),
  };
}

function crossGroupViews(
  groupWithApplets: GroupWithApplets[]
): CrossGroupViews {
  return {
    blocks: {},
    main: (element) => {},
  };
}

const applet: WeApplet = {
  attachableTypes: [],
  search: async () => [],
  groupViews,
  crossGroupViews,
};

export default applet;
