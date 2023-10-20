import { sharedStyles } from '@holochain-open-dev/elements';
import { css } from 'lit';

export const styles = [
  sharedStyles,
  css`
    sl-tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    sl-tab-group::part(body) {
      display: flex;
      flex: 1;
    }
    sl-tab-group {
      display: flex;
    }
    sl-tab-group::part(base) {
      display: flex;
      flex: 1;
    }
    sl-tab-panel::part(base) {
      width: 100%;
      height: 100%;
    }
    sl-tab-panel {
      width: 100%;
    }
    .flex-scrollable-parent {
      width: 100%;
      height: 100%;
    }
  `,
];
