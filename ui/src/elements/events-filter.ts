import { sharedStyles, wrapPathInSvg } from '@holochain-open-dev/elements';
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { msg } from '@lit/localize';
import { classMap } from 'lit/directives/class-map.js';
import { mdiChevronDown } from '@mdi/js';
import { consume } from '@lit-labs/context';

import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio-button/radio-button.js';
import SlRadioGroup from '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';

import { isMobileContext } from '../context.js';
import { EventStatus } from '../types.js';

export interface Filter {
  type: 'events' | 'event_proposals';
  status: EventStatus;
  view: 'list' | 'calendar';
}
export function defaultFilter(): Filter {
  return {
    type: 'events',
    status: 'upcoming',
    view: 'list',
  };
}

@customElement('events-filter')
export class EventsFilter extends LitElement {
  @property()
  filter: Filter = defaultFilter();

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  dispathFilterChanged() {
    this.filter = {
      type: (this.shadowRoot!.getElementById('type')! as SlRadioGroup).value,
      status: (this.shadowRoot!.getElementById('status')! as SlRadioGroup)
        .value,
      view: (this.shadowRoot!.getElementById('view')! as SlRadioGroup).value,
    } as Filter;
    this.dispatchEvent(
      new CustomEvent('filter-changed', {
        bubbles: true,
        composed: true,
        detail: this.filter,
      })
    );
  }

  get title() {
    if (this.filter.type === 'events' && this.filter.status === 'upcoming')
      return msg('All upcoming events');
    if (this.filter.type === 'events' && this.filter.status === 'past')
      return msg('All past events');
    if (
      this.filter.type === 'event_proposals' &&
      this.filter.status === 'upcoming'
    )
      return msg('All upcoming event proposals');
    if (this.filter.type === 'event_proposals' && this.filter.status === 'past')
      return msg('All past event proposals');
    return '';
  }

  renderFilter() {
    return html`
      <div
        class=${classMap({
          bar: !this._isMobile,
          drawer: !!this._isMobile,
        })}
        style="flex: 1; gap: 32px; "
        @sl-change=${() => this.dispathFilterChanged()}
      >
        <sl-radio-group
          .label=${this._isMobile && msg('Type')}
          .value=${this.filter.type}
          id="type"
        >
          <sl-radio-button value="events">${msg('Events')}</sl-radio-button>
          <sl-radio-button value="event_proposals"
            >${msg('Event Proposals')}</sl-radio-button
          >
        </sl-radio-group>
        <sl-radio-group
          .label=${this._isMobile && msg('Status')}
          .value=${this.filter.status}
          id="status"
        >
          <sl-radio-button value="upcoming">${msg('Upcoming')}</sl-radio-button>
          <sl-radio-button value="past">${msg('Past')}</sl-radio-button>
          <sl-radio-button value="cancelled"
            >${msg('Cancelled')}</sl-radio-button
          >
        </sl-radio-group>
        <sl-radio-group
          .label=${this._isMobile && msg('View')}
          .value=${this.filter.view}
          id="view"
        >
          <sl-radio-button value="list">${msg('List')}</sl-radio-button>
          <sl-radio-button value="calendar">${msg('Calendar')}</sl-radio-button>
        </sl-radio-group>
      </div>
    `;
  }

  render() {
    if (this._isMobile)
      return html`
        <sl-button
          variant="neutral"
          size="large"
          @click=${() => this.shadowRoot?.querySelector('sl-drawer')!.show()}
          style="border-radius: 0; width: 100%;"
        >
          <sl-icon
            slot="prefix"
            .src=${wrapPathInSvg(mdiChevronDown)}
          ></sl-icon>
          ${this.title}
        </sl-button>
        <sl-drawer contained placement="top" .label=${msg('Filter')}>
          ${this.renderFilter()}
        </sl-drawer>
      `;
    return html`<div
      class="row"
      style="align-items: center;flex:1 ; margin: 8px"
    >
      <span style="flex: 1" class="title">${this.title}</span
      >${this.renderFilter()}
    </div>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
      sl-radio-group::part(button-group) {
        width: 100%;
      }
      sl-radio-button {
        flex: 1;
      }
      sl-button::part(base) {
        border-radius: 0;
      }
      .drawer {
        display: flex;
        flex-direction: column;
      }
      .bar {
        justify-content: end;
        display: flex;
        flex-direction: row;
      }
    `,
    sharedStyles,
  ];
}
