import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import '@holochain-open-dev/profiles/dist/elements/search-agent.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import {
  FormField,
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from '@holochain-open-dev/elements';
import { AgentPubKey } from '@holochain/client';
import { msg } from '@lit/localize';

import './profile-list-item.js';
import { mdiDelete } from '@mdi/js';

@customElement('search-agents')
export class SearchAgents extends LitElement implements FormField {
  /** Form field properties */

  /**
   * The name of the field if this element is used inside a form
   * Required only if the element is used inside a form
   */
  @property()
  name!: string;

  /**
   * The default value of the field if this element is used inside a form
   */
  @property(hashProperty('default-value'))
  defaultValue: Array<AgentPubKey> = [];

  /**
   * Whether this field is required if this element is used inside a form
   */
  @property()
  required = false;

  /**
   * Whether this field is disabled if this element is used inside a form
   */
  @property()
  disabled = false;

  /**
   * @internal
   */
  @state()
  value: AgentPubKey[] = [];

  render() {
    return html`
      <div class="column" style="gap: 16px">
        <search-agents
          clear-on-select
          @agent-selected=${(e: any) =>
            (this.value = [...this.value, e.detail.agentPubKey])}
        ></search-agent>
        ${
          this.value.length === 0
            ? html`<span class="placeholder"
                >${msg('No other agents selected yet.')}</span
              >`
            : this.value.map(
                (agent, i) =>
                  html`<div class="row">
                    <profile-list-item
                      style="flex: 1"
                      .agentPubKey=${agent}
                    ></profile-list-item
                    ><sl-icon-button
                      .src=${wrapPathInSvg(mdiDelete)}
                      @click=${() => {
                        this.value = this.value.filter((v, i2) => i2 !== i);
                      }}
                    ></sl-icon-button>
                  </div>`
              )
        }
      </div>
    `;
  }

  static styles = [sharedStyles];
}
