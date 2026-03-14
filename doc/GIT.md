# Git Rules

## Commit Format
```
type: short description
```

## Types
- `feat` — New feature or functionality
- `fix` — Bug fix
- `refactor` — Code restructuring without behavior change
- `style` — Visual/CSS changes only
- `chore` — Dependencies, config, tooling
- `docs` — Documentation updates

## Examples
```
feat: add expense form with sub-category picker
fix: salary cycle boundary calculation
refactor: extract dashboard data fetching to lib
style: improve budget card progress bar colors
chore: install shadcn sheet and avatar components
docs: update CLAUDE.md progress and rules
```

## Strict Rules
- **No Co-Authored-By lines** — ever. All commits authored solely under user's name.
- **Commit after each logical change** — not after every file, not at the end of everything.
- **Build before commit** — run `npm run build` and fix errors first.
- **No force push** without explicit user request.
- **No interactive rebase** (`-i` flag not supported).
- **Never commit secrets** (`.env`, credentials, API keys).
