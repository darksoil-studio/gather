import { createContext } from '@lit-labs/context';

import { GatherStore } from './gather-store.js';

export const gatherStoreContext = createContext<GatherStore>(
  'hc_zome_gather/store'
);
