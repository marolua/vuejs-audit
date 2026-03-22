# vuejs-audit

> Diagnose and fix your Vue.js code in one command.

Scans your codebase for security, performance, correctness, and architecture issues, then outputs a **0-100 health score** with actionable diagnostics.

## Install & run

```bash
npx vuejs-audit .
```

Use `--verbose` to see file paths and line numbers:

```bash
npx vuejs-audit . --verbose
```

Output only the score (useful in CI):

```bash
npx vuejs-audit . --score
```

## What it checks

**22+ rules** across 7 categories:

| Category        | Rules |
| --------------- | ----- |
| Reactivity      | Missing `:key` in `v-for`, `v-if` with `v-for`, direct prop mutation, `ref` without `.value`, Options API usage |
| Correctness     | `console.log` in components, empty `<script>` blocks, missing `<script setup>`, unused component imports |
| Security        | `v-html` XSS risk, hardcoded API keys/secrets, private runtime config leak (Nuxt) |
| Performance     | Inline object props, index as `:key`, components >300 lines, deep watchers |
| Accessibility   | Missing `alt` on `<img>`, click handlers without keyboard support, missing form labels |
| Architecture    | Vuex in Vue 3, mixins usage, deprecated deep selectors (`>>>`, `/deep/`), unscoped styles, `:global()` overuse |
| Nuxt            | Missing `error.vue`, raw `fetch()` instead of `useFetch`, missing `definePageMeta` |

### Auto-detection

- Nuxt-specific rules only run in Nuxt projects
- Vue 3 migration rules (e.g. Vuex, Options API) only fire when relevant
- TypeScript hints only appear if TS is detected

## Score

| Score  | Label       |
| ------ | ----------- |
| 85-100 | Excellent   |
| 70-84  | Good        |
| 50-69  | Needs work  |
| 0-49   | Critical    |

Errors weigh 5pt, warnings 1pt.

## Configuration

Create `vue-audit.config.json` at your project root:

```json
{
    "ignore": {
        "rules": ["vue/no-v-html"],
        "files": ["src/generated/**"]
    }
}
```

Or use the `"vueAudit"` key in `package.json`.

## Inline suppression

```vue
<!-- vue-audit-disable-next-line -->
<div v-html="trustedContent"></div>

<div v-html="content"></div> <!-- vue-audit-disable-line -->
```

## Programmatic API

```ts
import { diagnose } from 'vuejs-audit/api';

const result = await diagnose('./my-app');

console.log(result.score);        // { score: 78, label: 'Good', errors: 2, warnings: 8 }
console.log(result.project);      // { framework: 'Nuxt', vueVersion: '^3.5.0', typescript: true }
console.log(result.diagnostics);  // Diagnostic[]
```

## CLI Options

```
Usage: vuejs-audit [options] [directory]

Options:
  --verbose            Show file paths and line numbers for each issue
  --score              Output only the health score (for CI)
  --fail-on <level>    Exit with code 1 on "error", "warning", or "none" (default: "none")
  -V, --version        Output the version number
  -h, --help           Display help
```

## GitHub Actions

```yaml
- uses: actions/checkout@v4
- name: Run vuejs-audit
  run: npx vuejs-audit . --fail-on error
```

## License

MIT
