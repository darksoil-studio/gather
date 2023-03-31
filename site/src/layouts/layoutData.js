import { html } from "lit";

import { PageTree } from "@rocket/engine";

export const pageTree = new PageTree();
await pageTree.restore(
  new URL("../../pages/pageTreeData.rocketGenerated.json", import.meta.url)
);
import "../elements/custom-social-link.js";

export const layoutData = {
  pageTree,
  titleWrapperFn: (title) => title,
  description: "Welcome to gather, a darksoil studio project",
  siteName: "gather",

  head__150: html`<link rel="stylesheet" href="resolve:#src/css/page.css" />`,

  header__100: html` <div style="display: inline-block; position: relative">
    <div
      class="custom-social-links"
      style="display: flex; position: absolute; justify-content: center; align-items: center; margin-left: 8px"
    >
      <custom-social-link
        style="--primary-text-color: white; --primary-color: var(--theme-secondary); "
        name="OpenCollective"
        url="https://opencollective.com/darksoil/projects/wegather"
      ></custom-social-link>
      <custom-social-link
        style="--primary-text-color: white; --primary-color: var(white); "
        name="Github"
        url="https://github.com/darksoil-studio/gather"
      ></custom-social-link>
    </div>
  </div>`,

  footer__10: html``,
};

/*old footer
<rocket-content-area>
<rocket-columns>
<div>
  <strong>Find Us</strong><br />
  <br />
  email:<br />
  
</div>

<div class="legal">
  <strong>More</strong> <br />
  <a href="#">About</a><br />
  <a href="#">Us</a><br />
  <a href="#">Welcome</a><br />
</div>
</rocket-columns>
</rocket-content-area>*/
