import { hashProperty, sharedStyles } from '@holochain-open-dev/elements';
import { ActionHash } from '@holochain/client';
import { consume } from '@lit-labs/context';
import { localized, msg } from '@lit/localize';
import { html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { isMobileContext } from '../context';

@localized()
@customElement('call-to-action-needs')
export class CallToActionNeeds extends LitElement {
  @property(hashProperty('call-to-action-hash'))
  callToActionHash!: ActionHash;

  /**
   * @internal
   */
  @state()
  _activePanel: 'unsatisfied_needs' | 'satisfied_needs' = 'unsatisfied_needs';

  /**
   * @internal
   */
  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  render() {
    if (this._isMobile)
      return html`
        <div class="column" style="gap: 16px;">
          <div class="column" style="align-items: center;">
            <sl-radio-group
              value="unsatisfied_needs"
              @sl-change=${(e: any) => {
                this._activePanel = e.target.value;
              }}
            >
              <sl-radio-button value="unsatisfied_needs"
                >${msg('Unsatisfied Needs')}</sl-radio-button
              >
              <sl-radio-button value="satisfied_needs"
                >${msg('Satisfied Needs')}</sl-radio-button
              >
            </sl-radio-group>
          </div>
          ${this._activePanel === 'unsatisfied_needs'
            ? html`
                <call-to-action-unsatisfied-needs
                  .callToActionHash=${this.callToActionHash}
                  .hideNeeds=${[0]}
                ></call-to-action-unsatisfied-needs>
              `
            : html`
                <call-to-action-satisfied-needs
                  .callToActionHash=${this.callToActionHash}
                  .hideNeeds=${[0]}
                ></call-to-action-satisfied-needs>
              `}
        </div>
      `;
    return html`
      <div class="row" style="gap: 16px">
        <div class="column" style="gap: 16px; width: 400px">
          <span class="title">${msg('Unsatisfied needs')}</span>
          <call-to-action-unsatisfied-needs
            .callToActionHash=${this.callToActionHash}
            .hideNeeds=${[0]}
          ></call-to-action-unsatisfied-needs>
        </div>
        <div class="column" style="gap: 16px; width: 400px">
          <span class="title">${msg('Satisfied needs')}</span>
          <call-to-action-satisfied-needs
            .callToActionHash=${this.callToActionHash}
            .hideNeeds=${[0]}
          ></call-to-action-satisfied-needs>
        </div>
      </div>
    `;
  }

  static styles = [sharedStyles];
}
