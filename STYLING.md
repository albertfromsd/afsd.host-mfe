# Styling guidelines

Rules for SCSS in this codebase. Where this disagrees with general
convention or external advice, follow this file.

## TL;DR

- **`rem` by default. `px` only when scaling is wrong.**
- **Consume semantic tokens, never palette tokens or raw values.**
- **No `!important`** outside documented exceptions.
- **One `*.module.scss` per component, colocated.**
- **Open every module file with** `@use 'shared/styles' as *;` if you need any helper.

The token system + mixins library do the heavy lifting; if you find yourself
writing a raw color, raw `px`, or `!important`, stop and check the
"Exceptions" section first.

## Units

### Rule 1 — default to `rem`

All sizes — padding, margin, gap, width, height, font-size, line-height,
border-radius, icon dimensions — use `rem`. The root is `16px` (set in
`global.scss`), so `1rem = 16px` and the math stays familiar.

Why: rems respect the user's browser font-size preference and scale
predictably under zoom. `px` everywhere breaks accessibility for users who
set a larger default font, and produces inconsistent visual hierarchy as
the page is zoomed.

**Prefer the `--space-*` and `--font-size-*` token vars** over raw `rem`
literals. The tokens are already in `rem`:

- ✅ `padding: var(--space-4);` (1rem)
- ✅ `font-size: var(--font-size-base);` (0.9375rem)
- ✅ `gap: 0.5rem;` (only if no matching token fits)
- ❌ `padding: 16px;`
- ❌ `gap: 8px;`

### Rule 2 — `px` is allowed but must be justified

Use `px` ONLY when one of these is true:

1. **Hairline borders** — `1px` doesn't render correctly at sub-pixel widths.
2. **Single-pixel `box-shadow` offsets** that should stay a physical pixel.
3. **Icon stroke widths in inline SVG** where the SVG must align with a
   non-scaling neighbor.
4. **Media-query breakpoint definitions** in `_breakpoints.scss` — these
   are already px and stay px (rems in media queries don't behave the way
   most engineers expect, and `_breakpoints.scss` is the single place this
   is allowed).
5. **`outline` widths** under `--focus-ring` if 1px is required for
   pixel-snap reasons.
6. **Shadow blur/offset values** inside `_tokens.scss` shadow definitions
   — shadows are physical visual effects; tokens express them in px and
   components consume the named `--shadow-*` vars.

**Every `px` value MUST have an inline comment** explaining why `rem`
would be wrong. No silent `px`. Examples:

```scss
.divider {
  // 1px — sub-pixel borders blur on non-retina; keep as device pixel.
  border-bottom: 1px solid var(--color-border-subtle);
}

.scrollbarThumb {
  // 6px — must match native scrollbar track width exactly.
  width: 6px;
}
```

Reviewers should reject unjustified `px`.

### Rule 3 — never use `em`

`em` compounds and produces unpredictable values inside nested components.
Use `rem` (page-relative) or token vars (theme-relative).

Exception: line-height (which is naturally unitless via the
`--line-height-*` tokens) and the rare case where you genuinely want
"proportional to current font-size and ONLY current" — flag with a
comment if so.

### Rule 4 — percentages and viewport units are fine

`width: 100%`, `min-height: 100dvh`, `max-width: 60ch` are all idiomatic
and don't need justification. Use them where they fit.

## Tokens — what to consume, what not to

### Never consume the palette layer

`_tokens.scss` has two layers:

- **Palette** — `--palette-slate-500`, `--palette-indigo-600`, ... raw color scales.
- **Semantic** — `--color-bg-surface`, `--color-text-primary`, `--color-accent`, ... theme-bound aliases.

**Components only consume semantic tokens.** The palette layer is for the
semantic layer to map into. Reaching past semantic → palette breaks the
theme contract: when a new theme is added, your component won't follow.

- ✅ `color: var(--color-text-primary);`
- ✅ `background: var(--color-bg-surface-raised);`
- ❌ `color: var(--palette-slate-900);`
- ❌ `background: rgba(255, 255, 255, 0.04);` (raw color)

### When a semantic token doesn't exist

Don't inline a raw color or shadow as a workaround. Add a new semantic
token in BOTH `:root[data-theme='dark']` and `:root[data-theme='light']`
blocks of `_tokens.scss`, then consume it.

Naming: `--color-{role}-{variant}`. Examples: `--color-bg-warning-subtle`,
`--color-border-success-strong`. Match the existing naming pattern; don't
invent a new scheme.

### Tokens you should memorize

| Category     | Tokens you'll use 90% of the time                                                       |
| ------------ | --------------------------------------------------------------------------------------- |
| Spacing      | `--space-1` (0.25rem) through `--space-20` (5rem)                                       |
| Radii        | `--radius-sm` `--radius-md` `--radius-lg` `--radius-full`                               |
| Font size    | `--font-size-sm` `--font-size-base` `--font-size-md` `--font-size-lg`                   |
| Color (bg)   | `--color-bg-canvas` `--color-bg-surface` `--color-bg-surface-raised` `--color-bg-hover` |
| Color (text) | `--color-text-primary` `--color-text-secondary` `--color-text-muted`                    |
| Border       | `--color-border-subtle` `--color-border-default` `--color-border-strong`                |
| Accent       | `--color-accent` `--color-accent-hover` `--color-accent-subtle`                         |
| Shadow       | `--shadow-xs` `--shadow-sm` `--shadow-md` `--shadow-lg`                                 |
| Z-index      | `--z-dropdown` `--z-navbar` `--z-modal` `--z-toast` (named scale, never raw numbers)    |
| Duration     | `--duration-fast` `--duration-base` `--duration-slow`                                   |
| Easing       | `--ease-standard` `--ease-out` `--ease-spring`                                          |

If a value isn't on this list, check `_tokens.scss` before inventing one.

### Z-index — always tokenized

Never write a raw `z-index: 1000`. The scale in `_tokens.scss` is the
contract for stacking; raw numbers create accidental overlaps as the app
grows.

- ❌ `z-index: 1000;`
- ✅ `z-index: var(--z-navbar);`

## Mixins — prefer them over re-implementing

`_mixins.scss` has reusable patterns. Reach for them before writing the
same handful of declarations:

| Need                       | Mixin                                                                |
| -------------------------- | -------------------------------------------------------------------- |
| Standard focus outline     | `@include focus-visible;`                                            |
| Visually hidden (a11y)     | `@include sr-only;`                                                  |
| Glassy frosted surface     | `@include glass-surface;`                                            |
| Card-like elevated surface | `@include elevated;`                                                 |
| Plain reset for `<button>` | `@include reset-button;`                                             |
| Plain reset for `<a>`      | `@include reset-link;`                                               |
| Reset `<ul>` / `<ol>`      | `@include reset-list;`                                               |
| Ellipsis on single line    | `@include truncate;`                                                 |
| N-line clamp               | `@include clamp-lines($lines: 3);`                                   |
| Multi-property transition  | `@include transition(color background-color, var(--duration-fast));` |

Typography mixins (`_typography.scss`) for headings/body — compose into
your own selectors, don't restate font-size + weight + line-height by hand:

```scss
.cardTitle {
  @include heading-3;
  color: var(--color-text-primary);
}
```

## Breakpoints — use the helpers, never inline `@media`

`_breakpoints.scss` defines the scale and exposes mixins. Use them.

✅

```scss
.nav {
  flex-direction: row;
  @include mobile {
    flex-direction: column;
  }
}
```

❌

```scss
.nav {
  flex-direction: row;
  @media (max-width: 768px) {
    // re-defines the breakpoint locally
    flex-direction: column;
  }
}
```

Also never re-declare `$mobile-breakpoint: 768px;` at the top of your
module — that's exactly the duplication this file is trying to prevent.

Mixin reference:

| Mixin                             | Range                            |
| --------------------------------- | -------------------------------- |
| `@include mobile { ... }`         | up to 767.98px                   |
| `@include tablet-up { ... }`      | 768px and above                  |
| `@include desktop-up { ... }`     | 1024px and above                 |
| `@include until($bp-lg) { ... }`  | up to 1023.98px                  |
| `@include from($bp-xl) { ... }`   | 1280px and above                 |
| `@include reduced-motion { ... }` | `prefers-reduced-motion: reduce` |

## `!important` — banned by default

`!important` makes the cascade unpredictable. Don't use it.

### Exceptions (must be commented)

1. **Reduced-motion overrides** — `global.scss` already uses `!important`
   inside the `@include reduced-motion` block to forcibly disable
   animations. This is the canonical use case; new selectors that need
   to participate must follow that comment pattern.
2. **Print stylesheets** — overriding screen styles inside `@media print`.
3. **Overriding a third-party stylesheet** that ships with hardcoded
   specificity (rare; document the source).

Every `!important` MUST have a comment on the same line or the line above
explaining WHY. Example:

```scss
// !important: reduced-motion is a user accessibility preference and must
// win over any component-level transition. Matches the pattern in global.scss.
transition: none !important;
```

If you can't write that comment honestly, refactor instead.

## File organization

### One module per component, colocated

```
components/Button/
├── Button.tsx
├── Button.module.scss   ← matches the .tsx filename exactly
├── Button.test.tsx
└── index.ts
```

Module classnames are component-scoped automatically (CSS Modules); the
only globals come from `global.scss` and `_tokens.scss`.

### Importing the shared SCSS library

Every `*.module.scss` that uses ANY helper opens with:

```scss
@use 'shared/styles' as *;
```

This forwards `_mixins.scss`, `_breakpoints.scss`, and `_typography.scss`.
It does NOT emit CSS — token CSS variables come from `_tokens.scss` and
are emitted once by `global.scss`.

The `'shared/styles'` specifier resolves because `rsbuild.config.ts` and
`vitest.config.ts` add `src/` to Sass `loadPaths`. Don't write relative
paths like `'../../shared/styles'`.

### Classname casing

`camelCase` keys in `.module.scss` files. Maps cleanly to JS:

```scss
.cardTitle {
  /* ... */
}
.cardTitleActive {
  /* ... */
}
```

```tsx
className={s.cardTitle}
className={isActive ? `${s.cardTitle} ${s.cardTitleActive}` : s.cardTitle}
```

`kebab-case` is also legal but requires `s['card-title']` in JS — uglier.
Stick to camelCase.

### Composing classnames

For more than two conditional classes, build the className with a small
array → filter → join helper (already in use in `Button.tsx` and
`Card.tsx`). Don't reach for `clsx` for the same effect.

```tsx
const cls = [s.button, s[`v_${variant}`], s[`size_${size}`], fullWidth && s.fullWidth]
  .filter(Boolean)
  .join(' ');
```

## What NOT to do

These come up frequently and produce silent quality drift:

- **No inline `style={...}` for theming.** Inline style objects skip the
  token system and don't respond to theme changes. Move to a `.module.scss`.
- **No Tailwind for color, theming, or thematic spacing.** Tailwind v4
  utilities are fine for one-off layout (`flex`, `gap-4`, `items-center`)
  but never for colors or anything that should follow the theme — use
  CSS vars there.
- **No `:global(...)` selectors** unless you're styling output from a
  library you don't control (e.g., a chart's tooltip). When used, comment
  why.
- **No `@use 'sass:color';`-based color math** at component level. The
  theme decides colors; components consume.
- **No `padding: 1rem 2rem;` mixing tokens with raw values.** Pick one:
  all tokens, or all raw (only inside `_tokens.scss` and `global.scss`).

## Adding a new theme

1. Add a `:root[data-theme='<id>'] { /* semantic vars */ }` block in
   `_tokens.scss` — same shape as `dark` and `light`.
2. Append an entry to `THEMES` in `shared/styles/theme.config.ts`.
3. Widen the `Theme` union in `shared/stores/slices/uiSlice.ts`
   (host) and `shared/stores/localStore.ts` (remote).
4. Verify every component looks correct under the new theme. The token
   layer should make this automatic — if it isn't, a component is
   reaching past the semantic layer.

## When you genuinely need a new design value

Sequence to follow:

1. **Check** `_tokens.scss` first — there's likely a token that fits.
2. **Check** `_mixins.scss` — there's likely a mixin that does the work.
3. **Promote** the value into `_tokens.scss` under both theme blocks if
   it's a new semantic role.
4. **Promote** the pattern into `_mixins.scss` if 2+ components would
   compose it.
5. Only then write the rule into your component's module.

Don't skip steps. The reason this file exists is that "just inline it
this once" compounds into a parallel design system within months.

## Reviewer's checklist

When reviewing SCSS changes, the high-signal things to catch:

- [ ] No raw colors (`#fff`, `rgb(...)`, named colors). Should be a token.
- [ ] No raw `z-index` numbers. Should be a `--z-*` token.
- [ ] All `px` values have a comment explaining why they aren't `rem`.
- [ ] No `!important` without a same-line/above comment.
- [ ] Every module file uses `@use 'shared/styles' as *;` if it touches mixins.
- [ ] Breakpoints come from mixins, not local `@media` declarations.
- [ ] No local `$mobile-breakpoint` or other re-declaration of values that
      already live in `_breakpoints.scss` / `_tokens.scss`.
- [ ] Classnames are camelCase and named for the role, not the appearance
      (`cardTitle`, not `whiteBoldText`).
