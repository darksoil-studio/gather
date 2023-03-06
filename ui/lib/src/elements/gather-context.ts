import { css, html, LitElement } from 'lit';
import { provide } from '@lit-labs/context';
import { property } from 'lit/decorators.js';

import { gatherStoreContext } from '../context';
import { GatherStore } from '../gather-store';

export class GatherContext extends LitElement {
  @provide({ context: gatherStoreContext })
  @property({ type: Object })
  store!: GatherStore;

  render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}
