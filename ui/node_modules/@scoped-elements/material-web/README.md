# @scoped-elements/material-web

This is the [Material Web Components](https://github.com/material-components/material-web) library packaged using the scoped custom elements registries pattern using [@open-wc/scoped-elements](https://www.npmjs.com/package/@open-wc/scoped-elements).

## Installation

```bash
npm i @scoped-elements/material-web
```

## Usage

### As an sub element in your own custom element

```js
import { Checkbox } from '@scoped-elements/material-web';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

export class CustomElement extends ScopedElementsMixin(LitElement) {
  static get scopedElements() {
    return {
      'mwc-checkbox': Checkbox
    };
  }

  render() {
    return html`
      <mwc-checkbox checked></mwc-checkbox>
    `;
  }
}
```

### As a globally defined custom element

```js
import { Checkbox } from '@scoped-elements/material-web';

customElements.define('mwc-checkbox', Checkbox);

// Use in the same way as the material components library in the html
```

## Documentation for the elements

As this package is just a re-export, you can find the documentation for the elements in each of their npm pages, e.g.: https://www.npmjs.com/package/@material/mwc-checkbox.