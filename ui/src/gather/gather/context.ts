import { createContext } from '@lit/context';

import { GatherStore } from './gather-store.js';

export const gatherStoreContext = createContext<GatherStore>(
  'hc_zome_gather/store'
);

export const isMobileContext = createContext<boolean>('ismobile');
