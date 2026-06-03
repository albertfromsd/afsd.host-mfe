/**
 * Plop generators for the AFSD host template.
 *
 * Run `pnpm gen` for interactive picker, or `pnpm gen:component MyThing`
 * for one-shot. Templates live in `plop-templates/`.
 *
 * Each generator produces files that follow the conventions in AGENTS.md
 * and STYLING.md — so a vibe-coding AI agent gets correct boilerplate
 * without having to relitigate folder structure, alias usage, or imports.
 */

export default function plop(/** @type {import('plop').NodePlopAPI} */ plop) {
  // ─────────────────────────────────────────────────────────────────────
  // component — leaf UI primitive in src/components/<Name>/
  // ─────────────────────────────────────────────────────────────────────
  plop.setGenerator('component', {
    description: 'Leaf UI primitive in src/components/<Name>/',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Component name (PascalCase, e.g. Toggle):',
        validate: (v) => /^[A-Z]\w+$/.test(v) || 'Must start with an uppercase letter.',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/components/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'plop-templates/component/Component.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/components/{{pascalCase name}}/{{pascalCase name}}.module.scss',
        templateFile: 'plop-templates/component/Component.module.scss.hbs',
      },
      {
        type: 'add',
        path: 'src/components/{{pascalCase name}}/{{pascalCase name}}.test.tsx',
        templateFile: 'plop-templates/component/Component.test.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/components/{{pascalCase name}}/index.ts',
        templateFile: 'plop-templates/component/index.ts.hbs',
      },
    ],
  });

  // ─────────────────────────────────────────────────────────────────────
  // page — route-level component in src/pages/<Name>/
  // ─────────────────────────────────────────────────────────────────────
  plop.setGenerator('page', {
    description: 'Route-level page in src/pages/<Name>/',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Page name (PascalCase, e.g. Checkout):',
        validate: (v) => /^[A-Z]\w+$/.test(v) || 'Must start with an uppercase letter.',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/pages/{{pascalCase name}}/{{pascalCase name}}.tsx',
        templateFile: 'plop-templates/page/Page.tsx.hbs',
      },
      {
        type: 'add',
        path: 'src/pages/{{pascalCase name}}/index.ts',
        templateFile: 'plop-templates/page/index.ts.hbs',
      },
    ],
  });

  // ─────────────────────────────────────────────────────────────────────
  // slice — zustand slice in src/shared/stores/slices/
  //
  // ⚠ Slices are part of the cross-template AppState contract. The
  // generator emits an instructions block reminding you to mirror the
  // shape in the remote template's localStore.ts + remotes.d.ts. The CI
  // sync check (`pnpm check:sync`) fails until you do.
  // ─────────────────────────────────────────────────────────────────────
  plop.setGenerator('slice', {
    description: 'Zustand slice in src/shared/stores/slices/ (host canonical)',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Slice base name (camelCase, e.g. notifications — final filename will be <name>Slice.ts):',
        validate: (v) => /^[a-z]\w*$/.test(v) || 'Must start with a lowercase letter.',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/shared/stores/slices/{{camelCase name}}Slice.ts',
        templateFile: 'plop-templates/slice/slice.ts.hbs',
      },
      // Print the follow-up checklist. Plop runs `function` actions inline.
      function (answers) {
        const Name = plop.getHelper('pascalCase')(answers.name);
        return [
          '',
          `Next steps (or the sync check will fail):`,
          `  1. In src/shared/stores/store.ts: import { create${Name}Slice, type ${Name}Slice } and compose it.`,
          `  2. In ../afsd.remote-mfe/src/shared/stores/localStore.ts: mirror the fields.`,
          `  3. In ../afsd.remote-mfe/src/shared/types/remotes.d.ts: mirror the type.`,
          `  4. Run \`pnpm check:sync\` to verify.`,
          `  5. Bump STORAGE.STORE_VERSION in BOTH app.constants.ts files iff the shape is persist-incompatible.`,
          '',
        ].join('\n');
      },
    ],
  });
}
