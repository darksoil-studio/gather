import { rocketSpark } from "@rocket/spark";
import { addPlugin, applyPlugins } from "plugins-manager";
import replace from "@rollup/plugin-replace";

export default /** @type {import('@rocket/cli').RocketCliOptions} */ {
  absoluteBaseUrl: "http://localhost:8080",
  longFileHeaderWidth: 100,
  longFileHeaderComment: "// prettier-ignore",
  presets: [rocketSpark()],
  setupDevServerAndBuildPlugins: [
    addPlugin(
      replace,
      {
        'await import("crypto")': "undefined",
        "import { ScopedElementsMixin } from '@open-wc/scoped-elements';": `import pkg from '@open-wc/scoped-elements';
        const { ScopedElementsMixin } = pkg;`,
        delimiters: ["", ""],
      },
      { location: "top" }
    ),
  ],
};
