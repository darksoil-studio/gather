import { configureLocalization } from '@lit/localize';
import { sendRequest } from './holochain-app.js';

export async function setLocale() {
  const locales = (await sendRequest({
    type: 'get-locales',
  })) as Array<string>;
  // const locales = ['es-419'];

  const sourceLocale = 'en';
  const targetLocales = ['es-419'];
  const allLocales = [sourceLocale, ...targetLocales];
  const localization = configureLocalization({
    sourceLocale,
    targetLocales,
    // Step 1: make this an async method
    loadLocale: async locale => {
      // Step 2: Load both the templates of the app and the library (assuming the library also publishes its templates)
      const t = await Promise.all([import(`../locales/${locale}.js`)]);
      const templates = t.reduce(
        (acc, next) => ({ ...acc.templates, ...next.templates }),
        {}
      );

      // Step 3: Merge the templates and return them as one
      return { templates };
    },
  });

  for (const locale of locales) {
    if (allLocales.includes(locale)) {
      localization.setLocale(locale);

      return;
    }
  }
}
