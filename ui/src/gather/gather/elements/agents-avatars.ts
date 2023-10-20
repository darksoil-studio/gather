import { AgentPubKey } from '@holochain/client';
import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styles } from '../../../styles';

@customElement('agents-avatar')
export class AgentsAvatars extends LitElement {
  @property()
  agents!: AgentPubKey[];

  render() {
    return html`
      <div class="row avatar-group">
        ${this.agents
          .slice(0, 3)
          .map(a => html`<agent-avatar .agentPubKey=${a}></agent-avatar>`)}
        ${this.agents.length > 3
          ? html`<sl-avatar
              .initials=${`+${this.agents.length - 3}`}
              style="--size: 32px"
            ></sl-avatar>`
          : html``}
      </div>
    `;
  }

  static styles = [
    css`
      .avatar-group agent-avatar:not(:first-of-type) {
        margin-left: -0.5rem;
      }
    `,
    styles,
  ];
}
