import { test, assert } from 'vitest';

import { runScenario } from '@holochain/tryorama';
import { setup } from './utils.js';

test('test zome traits', async t => {
  await runScenario(
    async scenario => {
      const { alice } = await setup(scenario);

      const result = await (alice.store.alertsStore.client as any).callZome(
        '__implemented_zome_traits',
        null
      );
      console.log(result);
    },
    true,
    { timeout: 30000 }
  );
});
