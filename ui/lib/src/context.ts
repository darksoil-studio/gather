import { createContext } from '@lit-labs/context';

import { GatherStore } from './gather-store';

export const gatherStoreContext = createContext<GatherStore>(
  'hc_zome_gather/store'
);
