import {parse as parsePath} from 'path';
import {readFile, writeFile} from 'fs/promises';
import {parse} from 'yaml';
import {flatten} from 'flat';
import fg from 'fast-glob';
import Joi from 'joi';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';
import {configFilter, translationFilter} from './file-filters';
import {I18nConfig, I18nFallbackMapping} from '../src/lib/i18n-config';
import mustache from 'mustache';

const langRe = /^[a-zA-Z]+(?:-(?:[a-zA-Z]+|\d+))*$/;

const template = `<details>
<summary><h3>Translation check problems (click to expand)</h3></summary>

{{#notes}}
### ℹ Notes ℹ

{{#items}}
- {{text}}
{{/items}}
{{/notes}}

{{#warnings}}
### ⚠️ Warnings ⚠️

{{#items}}
- {{text}}
{{/items}}
{{/warnings}}

{{#errors}}
### 🛑 Errors 🛑

{{#items}}
- {{text}}
{{/items}}
{{/errors}}
</details>
`;

// Types for translation information
type TranslationTree = string | {[key: string]: TranslationTree};
interface Translation {
  file: string;
  name: string;
  text?: string;
  parsed?: TranslationTree;
  keys?: string[];
}

function checkTranslationNames(
  translations: string[],
  warnings: string[],
  errors: string[],
) {
  translations.forEach((t) => {
    // default is invalid name
    if (t === 'default') {
      errors.push(`Translation name "${t}" is invalid!`);
    } else if (!langRe.test(t)) {
      warnings.push(`Translation "${t}" does not match pattern ${langRe}`);
    }
  });
}

function validateLangString(
  schema: Joi.StringSchema,
  value: string,
  errors: string[],
  errorMessage: string,
) {
  const res = schema.validate(value);
  if (res.error) {
    errors.push(errorMessage);
  }
}

function validateLangArray(
  schema: Joi.StringSchema,
  value: string[],
  errors: string[],
  errorMessage: string,
  objectPath = 'fallbackLocale',
) {
  if (value.length === 0) {
    errors.push(`"${objectPath}" array cannot be empty\n${errorMessage}`);
    return;
  }
  const invalid: string[] = [];
  value.forEach((v) => {
    const res = schema.validate(v);
    if (res.error) {
      invalid.push(String(v));
    }
  });
  if (invalid.length > 0) {
    errors.push(
      `Invalid values in "${objectPath}" array: [${invalid.join(
        ', ',
      )}]\n${errorMessage}`,
    );
  }
}

function validateLangObject(
  schema: Joi.StringSchema,
  keySchema: Joi.StringSchema,
  validFbObjKeys: string[],
  fbObject: I18nFallbackMapping,
  errors: string[],
  errorMessage: string,
) {
  Object.entries(fbObject).forEach(([key, value]) => {
    const path = `fallbackLocale.${key}`;

    const res = keySchema.validate(key);
    if (res.error) {
      const keys = `[${validFbObjKeys.join(', ')}]`;
      errors.push(
        `"fallbackLocale" has invalid key "${key}". Keys must be any of ${keys}`,
      );
    }

    if (Array.isArray(value)) {
      validateLangArray(
        schema,
        value,
        errors,
        `"${path}" ${errorMessage}`,
        path,
      );
    } else {
      errors.push(`"${path}" ${errorMessage}`);
    }
  });
}

function validateConfig(
  c: I18nConfig,
  translations: string[],
  errors: string[],
): {referenceLocaleOk: boolean; fallbackOk: boolean} {
  const validFbObjKeys = ['default', ...translations];
  const joiLangString = Joi.string()
    .valid(...translations)
    .strict();
  const joiLangKeyString = Joi.string()
    .valid(...validFbObjKeys)
    .strict();
  const joiLangStringArray = Joi.array().min(1).items(joiLangString);
  const joiFallbackObject = Joi.object().pattern(
    joiLangKeyString,
    Joi.alternatives().try(joiLangStringArray),
  );
  let referenceLocaleOk = true;
  let fallbackOk = true;

  const fbUrl = 'https://vue-i18n.intlify.dev/guide/essentials/fallback.html';
  const tarr = `[${translations.join(', ')}]`;
  const errFbLocaleObj = `"fallbackLocale" value must be one of ${tarr},\nan array of them or a decision map\n(see: ${fbUrl})`;
  const errFbArray = `value must an array with at least one of items\n${tarr}`;

  // Not validating a "full schema" at once because `fallbackLocale`
  // failures would give very vague error: "fallbackLocale" does not match any of the allowed types.
  // Validating in parts gives more detailed information about errors.
  {
    // Check referenceLocale, fallbackWarn and missingWarn
    const schema = Joi.object<I18nConfig>({
      referenceLocale: joiLangString.required(),
      fallbackWarn: Joi.boolean(),
      missingWarn: Joi.boolean(),
    })
      .unknown(true)
      .strict();
    const res = schema.validate(c);
    if (res.error) {
      errors.push(...res.error.details.map((d) => d.message));
      referenceLocaleOk = false;
    }
  }
  {
    // Check fallbackLocale
    const schema = Joi.object<I18nConfig>({
      fallbackLocale: Joi.alternatives()
        .try(joiLangString, joiLangStringArray, joiFallbackObject)
        .optional(),
    })
      .unknown(true)
      .strict();

    const res = schema.validate(c);
    if (res.error) {
      if (typeof c.fallbackLocale === 'string') {
        validateLangString(
          joiLangString,
          c.fallbackLocale,
          errors,
          errFbLocaleObj,
        );
      } else if (Array.isArray(c.fallbackLocale)) {
        validateLangArray(
          joiLangString,
          c.fallbackLocale,
          errors,
          errFbLocaleObj,
        );
      } else if (
        typeof c.fallbackLocale === 'object' &&
        c.fallbackLocale !== null
      ) {
        validateLangObject(
          joiLangString,
          joiLangKeyString,
          validFbObjKeys,
          c.fallbackLocale,
          errors,
          errFbArray,
        );
      } else {
        errors.push(errFbLocaleObj);
      }
      delete c.fallbackLocale;
      fallbackOk = false;
    }
  }
  {
    // Check unknown keys
    const schema = Joi.object<I18nConfig>({
      referenceLocale: Joi.any(),
      fallbackLocale: Joi.any(),
      fallbackWarn: Joi.any(),
      missingWarn: Joi.any(),
    });
    const res = schema.validate(c);
    if (res.error) {
      errors.push(...res.error.details.map((d) => d.message));
    }
  }

  return {referenceLocaleOk, fallbackOk};
}

function resolveFallbacks(lang: string, config: I18nConfig): string[] {
  if (typeof config.fallbackLocale === 'string') {
    return [config.fallbackLocale];
  } else if (Array.isArray(config.fallbackLocale)) {
    return [...config.fallbackLocale];
  } else if (typeof config.fallbackLocale === 'object') {
    const fb = config.fallbackLocale;
    const found: string[] = [];
    [lang, 'default'].forEach((k) => {
      if (k in fb) {
        const v = fb[k];
        if (typeof v === 'string') {
          found.push(v);
        } else if (Array.isArray(v)) {
          found.push(...v);
        }
      }
    });
    return found;
  }
  return [];
}

function langKeysWithFallbacks(
  lang: string,
  translations: Translation[],
  config: I18nConfig,
): string[] {
  const langs = Array.from(new Set([lang, ...resolveFallbacks(lang, config)]));
  const keys: string[] = [];
  langs.forEach((l) => {
    const t = translations.find((t) => t.name === l);
    if (t && t.keys) {
      // Don't merge language.* keys
      keys.push(...t.keys.filter((k) => !k.startsWith('language.')));
    }
  });
  return Array.from(new Set(keys));
}

async function main(errors: string[], warnings: string[], notes: string[]) {
  const argv = await yargs(hideBin(process.argv)).options({
    m: {type: 'string', alias: 'md'}
  }).parseAsync();

  const translationFiles = await fg(translationFilter);
  if (translationFiles.length === 0) {
    errors.push('No translation files found!');
  }
  let translations: Translation[] = translationFiles.map((f) => ({
    file: f,
    name: parsePath(f).name,
  }));
  checkTranslationNames(
    translations.map((t) => t.name),
    warnings,
    errors,
  );
  // remove 'default' if it was in translations
  translations = translations.filter((t) => t.name !== 'default');

  const configFile = (await fg(configFilter))[0];
  if (!configFile) {
    errors.push('Config file not found!');
    return;
  }

  const configData = await readFile(configFile, {encoding: 'utf-8'});
  const config: I18nConfig = parse(configData);
  const {referenceLocaleOk, fallbackOk} = validateConfig(
    config,
    translations.map((t) => t.name),
    errors,
  );

  if (!fallbackOk) {
    notes.push(
      `Errors in configuration's "fallbackLocale" may cause false warnings until fixed`,
    );
  }

  for (const t of translations) {
    try {
      t.text = await readFile(t.file, {encoding: 'utf-8'});
    } catch (e) {
      const ee = e as Error;
      errors.push(`Failed to read ${t.file}:\n${ee.message}`);
      continue;
    }
    try {
      t.parsed = parse(t.text);
    } catch (e) {
      const ee = e as Error;
      errors.push(`Failed to parse ${t.file}:\n${ee.message}`);
      continue;
    }
    t.keys = Object.entries(flatten(t.parsed)).map(([key]) => key);
  }

  const noChkMissExcess =
    'NOTE: missing / excess translations were not checked because';
  if (!referenceLocaleOk) {
    notes.push(
      `${noChkMissExcess} "referenceLocale" is missing or invalid in configuration.`,
    );
    return;
  }
  const ref = translations.find(
    (t) => t.name === config.referenceLocale && t.keys,
  );
  if (!ref) {
    notes.push(
      `${noChkMissExcess} referenceLocale "${config.referenceLocale}" is missing or invalid.`,
    );
    return;
  }

  const checkTranslations = translations.filter(
    (t) => t.name !== config.referenceLocale && t.keys,
  );
  if (checkTranslations.length > 0) {
    notes.push(`Compared other translations to referenceLocale "${ref.name}"`);
  }
  checkTranslations.forEach((t) => {
    const tKeys = langKeysWithFallbacks(t.name, translations, config);
    const refKeys = ref.keys;
    if (!tKeys || !refKeys) return;
    // Missing keys:
    refKeys.forEach((k) => {
      // Skip "language.*" as they should only be in referenceLocale
      if (tKeys.indexOf(k) < 0 && !k.startsWith('language.')) {
        warnings.push(
          `Translation "${t.name}": missing key "${k}" (or missing fallback configuration)`,
        );
      }
    });
    // Excess keys:
    tKeys.forEach((k) => {
      // "language.*" should only be in referenceLocale
      if (k.startsWith('language.')) {
        warnings.push(
          `Translation "${t.name}": found language key "${k}", languages should only be in "referenceLocale" (${ref.name}) translation`,
        );
      } else if (refKeys.indexOf(k) < 0) {
        warnings.push(`Translation "${t.name}": excess key "${k}"`);
      }
    });
  });

  // Check that referenceLocale has all languages covered, and no excess languages
  const refErrNote = `Errors in referenceLocale's "language.*" keys may cause false warnings until fixed`;
  if (!ref.parsed || typeof ref.parsed !== 'object') {
    // Should not happen, yaml parsing should fail first.
    errors.push(
      `referenceLocale "${config.referenceLocale}" is missing or invalid`,
    );
    notes.push(refErrNote);
    return;
  }
  if (typeof ref.parsed.language === 'undefined') {
    errors.push(
      `referenceLocale "${config.referenceLocale}" is missing "language" key`,
    );
    notes.push(refErrNote);
    return;
  }
  if (typeof ref.parsed.language !== 'object' || ref.parsed.language === null) {
    errors.push(
      `referenceLocale's (${config.referenceLocale}) "language" key must be an object`,
    );
    notes.push(refErrNote);
    return;
  }
  const langTree = ref.parsed.language;
  const langs = Object.keys(langTree);
  const locales = translations.map((t) => t.name);
  locales.forEach((l) => {
    if (!langs.includes(l)) {
      const k = `language.${l}`;
      errors.push(
        `referenceLocale (${config.referenceLocale}) is missing a language key "${k}"`,
      );
    }
  });
  langs.forEach((l) => {
    const val = langTree[l];
    if (!locales.includes(l)) {
      const k = `language.${l}`;
      errors.push(
        `referenceLocale (${config.referenceLocale}) has an excess language key "${k}"`,
      );
    } else if (typeof val !== 'string' || val.trim() === '') {
      errors.push(
        `referenceLocale (${config.referenceLocale}) language "${l}" value must be a non-empty string`,
      );
    }
  });

  if (argv.m) {
    await outputMd(argv.m, errors, warnings, notes);
  }
}

async function outputMd(file: string, errors: string[], warnings: string[], notes: string[]): Promise<void> {
  const content = mustache.render(template, {
    errors: errors.length > 0
      ? {items: errors.map((i) => ({text: indent(i, 2)}))}
      : undefined,
      warnings: warnings.length > 0
      ? {items: warnings.map((i) => ({text: indent(i, 2)}))}
      : undefined,
      notes: notes.length > 0
      ? {items: notes.map((i) => ({text: indent(i, 2)}))}
      : undefined,
  });
  await writeFile(file, content, {encoding: 'utf-8'});
}

const indent = (s: string, c = 4, start = 1) => {
  return s
    .split(/[\r\n]+/)
    .map((s, i) => (i >= start ? `${''.padStart(c, ' ')}${s}` : s))
    .join('\n');
};

const errors: string[] = [];
const warnings: string[] = [];
const notes: string[] = [];
main(errors, warnings, notes)
  .catch((e) => errors.push(e.message))
  .finally(() => {
    let c = notes.length;
    if (c > 0) {
      console.log(`${c} NOTE${c !== 1 ? 'S' : ''}:`);
      notes.forEach((e) => console.log(`  - ${indent(e)}`));
    }
    c = warnings.length;
    if (c > 0) {
      console.log(`${c} WARNING${c !== 1 ? 'S' : ''}:`);
      warnings.forEach((w) => console.log(`  - ${indent(w)}`));
    }
    c = errors.length;
    if (c > 0) {
      console.log(`${c} ERROR${c !== 1 ? 'S' : ''}:`);
      errors.forEach((e) => console.log(`  - ${indent(e)}`));
    }

    if (errors.length > 0 || warnings.length > 0) {
      process.exit(1);
    }
  });
