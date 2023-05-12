import { css, html, LitElement } from 'lit';
import { ContextProvider, provide } from '@lit-labs/context';
import { customElement, property } from 'lit/decorators.js';

import { gatherStoreContext } from '../context.js';
import { GatherStore } from '../gather-store.js';
import { assembleStoreContext } from '@darksoil/assemble';

@customElement('gather-context')
export class GatherContext extends LitElement {
  @provide({ context: gatherStoreContext })
  @property({ type: Object })
  store!: GatherStore;

  connectedCallback() {
    super.connectedCallback();
    new ContextProvider(this, assembleStoreContext, this.store.assembleStore);
  }

  render() {
    return html`<slot></slot>`;
  }

  static styles = css`
    :host {
      display: contents;
    }
  `;
}
