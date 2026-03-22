# vuejs-audit

> Diagnose and fix your Svelte code in one command.

Scans your codebase for security, performance, correctness, and architecture issues, then outputs a **0–100 health score** with actionable diagnostics.

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
npx svelte-audit . --score
```

## What it checks

**22 rules** across 7 categories:

| Category        | Rules |
| --------------- | ----- |
| Reactivity      | Missing keys in `{#each}`, legacy `$:` declarations, `$derived` reassignment, `$effect` write loops, deprecated lifecycle hooks |
| Correctness     | `{@debug}` left in, `console.log` in components, empty `<script>` blocks |
| Security        | `{@html}` XSS risk, private env vars exposed to client |
| Performance     | Inline object props, `fetch()` in component vs load function, components >300 lines |
| Accessibility   | Missing `alt` on `<img>`, click handlers without keyboard support |
| Architecture    | Overuse of writable stores, `:global()` CSS, circular store dependencies |
| SvelteKit       | Missing `+error.svelte`, untyped load functions |

### Auto-detection

- SvelteKit-specific rules only run in SvelteKit projects
- Svelte 5 migration rules (e.g. `$:` usage) only fire when relevant
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

Create `svelte-audit.config.json` at your project root:

```json
{
    "ignore": {
        "rules": ["svelte/no-html-directive"],
        "files": ["src/generated/**"]
    }
}
```

Or use the `"svelteAudit"` key in `package.json`.

## Inline suppression

```svelte
<!-- svelte-audit-disable-next-line -->
{@html trustedContent}

{@html content} <!-- svelte-audit-disable-line -->
```

## Programmatic API

```ts
import { diagnose } from 'svelte-audit/api';

const result = await diagnose('./my-app');

console.log(result.score);        // { score: 78, label: 'Good', errors: 2, warnings: 8 }
console.log(result.project);      // { framework: 'SvelteKit', svelteVersion: '^5.0.0', typescript: true }
console.log(result.diagnostics);  // Diagnostic[]
```

## CLI Options

```
Usage: svelte-audit [options] [directory]

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
- name: Run svelte-audit
  run: npx svelte-audit . --fail-on error
```

## License

MIT
