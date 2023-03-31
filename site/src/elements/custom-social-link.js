import { LitElement, html, css } from "lit";

export class CustomSocialLink extends LitElement {
  static properties = {
    url: { type: String },
    name: { type: String },
    siteName: { type: String },
  };

  constructor() {
    super();
    this.url = "";
    this.name = "";
    this.siteName = "";
  }

  render() {
    return html`
      <a
        class="social-link"
        href="${this.url}"
        aria-label="${this.siteName} on ${this.name}"
        rel="noopener noreferrer"
        target="_blank"
        slot="social"
      >
        <span class="sr-only">${this.name}</span>
        <img src="https://cdn.simpleicons.org/${this.name.toLowerCase()}/white"
      </a>
    `;
  }

  static styles = [
    css`
      :host {
        display: block;
        width: 30px;
        height: 30px;
        margin-right: 15px;
      }
      svg {
        color: var(--primary-text-color);
        transition: color 0.3s ease-in-out;
      }
      svg:hover {
        color: var(--primary-color);
      }
      .sr-only {
        position: absolute;
        left: -10000px;
        top: auto;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      :host([dark-background]) svg {
        color: #fff;
      }
      :host([dark-background]) svg:hover {
        color: var(--primary-text-color);
      }
    `,
  ];
}
customElements.define("custom-social-link", CustomSocialLink);
