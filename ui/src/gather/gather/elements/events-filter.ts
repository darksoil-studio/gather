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
  status: EventStatus;
  view: 'list' | 'calendar';
}
export function defaultFilter(): Filter {
  return {
    status: 'upcoming_event',
    view: 'list',
  };
}

export function statusToTime(
  status: EventStatus
): 'upcoming' | 'past' | 'cancelled' {
  if (status === 'open_proposal' || status === 'upcoming_event')
    return 'upcoming';
  if (status === 'past_event' || status === 'expired_event_proposal')
    return 'past';
  return 'cancelled';
}

export function statusToType(
  status: EventStatus
): 'events' | 'event_proposals' {
  if (
    status === 'open_proposal' ||
    status === 'expired_event_proposal' ||
    status === 'cancelled_event_proposal'
  )
    return 'event_proposals';
  return 'events';
}

export function typeAndTimeToStatus(
  type: 'events' | 'event_proposals',
  time: 'upcoming' | 'past' | 'cancelled'
): EventStatus {
  if (type === 'events' && time === 'upcoming') return 'upcoming_event';
  if (type === 'events' && time === 'past') return 'past_event';
  if (type === 'events' && time === 'cancelled') return 'cancelled_event';
  if (type === 'event_proposals' && time === 'upcoming') return 'open_proposal';
  if (type === 'event_proposals' && time === 'past') return 'expired_proposal';
  return 'cancelled_proposal';
}

@customElement('events-filter')
export class EventsFilter extends LitElement {
  @property()
  filter: Filter = defaultFilter();

  @consume({ context: isMobileContext, subscribe: true })
  @property()
  _isMobile!: boolean;

  @property()
  category: 'all_events' | 'my_events' = 'all_events';

  type(): 'events' | 'event_proposals' {
    return (this.shadowRoot!.getElementById('type')! as SlRadioGroup)
      .value as any;
  }

  time() {
    return (this.shadowRoot!.getElementById('time')! as SlRadioGroup)
      .value as any;
  }

  dispathFilterChanged() {
    this.filter = {
      status: typeAndTimeToStatus(this.type(), this.time()),
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
    if (this.category === 'all_events') {
      if (this.filter.status === 'upcoming_event')
        return msg('All upcoming events');
      if (this.filter.status === 'past_event') return msg('All past events');
      if (this.filter.status === 'open_event_proposal')
        return msg('All open event proposals');
      if (this.filter.status === 'expired_event_proposal')
        return msg('All expired event proposals');
      if (this.filter.status === 'cancelled_event_proposal')
        return msg('All cancelled event proposals');
      if (this.filter.status === 'cancelled_event')
        return msg('All cancelled events ');
    } else {
      if (this.filter.status === 'upcoming_event')
        return msg('My upcoming events');
      if (this.filter.status === 'past_event') return msg('My past events');
      if (this.filter.status === 'open_event_proposal')
        return msg('My open event proposals');
      if (this.filter.status === 'expired_event_proposal')
        return msg('My expired event proposals');
      if (this.filter.status === 'cancelled_event_proposal')
        return msg('My cancelled event proposals');
      if (this.filter.status === 'cancelled_event')
        return msg('My cancelled events ');
    }
    return '';
  }

  renderFilter() {
    return html`
      <div
        class=${classMap({
          bar: !this._isMobile,
          drawer: !!this._isMobile,
        })}
        style="flex: 1;"
        @sl-change=${() => this.dispathFilterChanged()}
      >
        <sl-radio-group
          .label=${this._isMobile && msg('Type')}
          .value=${statusToType(this.filter.status)}
          id="type"
          @sl-change=${() => this.requestUpdate()}
        >
          <sl-radio-button value="events">${msg('Events')}</sl-radio-button>
          <sl-radio-button value="event_proposals"
            >${msg('Event Proposals')}</sl-radio-button
          >
        </sl-radio-group>
        <sl-radio-group
          .label=${this._isMobile && msg('Status')}
          .value=${statusToTime(this.filter.status)}
          id="time"
        >
          <sl-radio-button value="upcoming"
            >${statusToType(this.filter.status) === 'events'
              ? msg('Upcoming')
              : msg('Open')}</sl-radio-button
          >
          <sl-radio-button value="past"
            >${statusToType(this.filter.status) === 'events'
              ? msg('Past')
              : msg('Expired')}</sl-radio-button
          >
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
        gap: 32px;
      }
      .bar {
        justify-content: end;
        display: flex;
        flex-direction: row;
        gap: 16px;
      }
    `,
    sharedStyles,
  ];
}
