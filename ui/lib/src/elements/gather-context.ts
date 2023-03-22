import { css, html, LitElement } from 'lit';
import { provide } from '@lit-labs/context';
import { customElement, property } from 'lit/decorators.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';

@customElement('gather-context')
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
