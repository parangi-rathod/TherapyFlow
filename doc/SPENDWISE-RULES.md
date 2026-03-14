# SpendWise Development Rules

## Rule 1: Investigation Before Implementation
For any bug or feature involving more than a trivial change:
1. Read all relevant files first
2. Trace the complete code flow from actual code
3. Write a plan listing every change needed
4. Only then implement
No assumptions. No try-error-fix loops.

## Rule 2: Three-Tier Transaction Model
- `expense` → in spending totals, predictions, budgets
- `investment` → separate tracking, savings predictions, NOT in spending totals
- `transfer` → record-keeping only, excluded from ALL analytics
Never mix these in queries. Always filter by `transaction_type` explicitly.

## Rule 3: Sub-Category First
Users select sub-categories, not categories. Category is auto-linked.
Sub-categories have `default_transaction_type` that auto-sets the form.

## Rule 4: Salary Cycle is Primary
All analytics and predictions are cycle-based, not month-based.
Every transaction belongs to a salary_cycle_id.

## Rule 5: Fresh Data in Every Handler
Never rely on stale references. Always fetch fresh data from Supabase.

## Rule 6: RLS Everywhere
Every Supabase query runs through RLS. Never bypass with service role key in client code.
All tables enforce `auth.uid() = user_id`.

## Rule 7: Responsive From Day One
Every component must work on both desktop (≥1024px) and mobile (<1024px).
Desktop: sidebar nav. Mobile: bottom tab bar.

## Rule 8: Commit After Each Logical Change
Format: `type: short description`
Types: feat, fix, refactor, style, chore, docs
No Co-Authored-By lines. Never.

## Rule 9: Supabase FK Join Types
Supabase returns FK joins (e.g. `sub_category:sub_categories(name)`) as arrays in TS types even for single-row relations. When assigning to typed interfaces, use `as any` cast. Example:
```ts
recentTransactions: (result.data ?? []) as any,
```

## Rule 10: shadcn/ui base-nova Style
This project uses `base-nova` style which is built on `@base-ui/react`, NOT Radix.
- No `asChild` prop — doesn't exist. Use `render` prop or direct children
- `DropdownMenuTrigger` accepts children directly (no wrapping needed)
- `SheetContent` uses `side` prop and `showCloseButton`

## Rule 11: Recharts Tooltip Formatter
Recharts `Tooltip` formatter must handle `ValueType | undefined`. Always use:
```tsx
formatter={(v) => fmt(Number(v))}
```
Never type the parameter as `number` directly.

## Rule 12: Update CLAUDE.md on Progress
After completing a phase or major feature, update:
- `Current Phase` section in CLAUDE.md
- Progress checklist
- Any new key files/patterns discovered
