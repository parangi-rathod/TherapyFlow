# Development Rules & Regulations

This document defines mandatory development rules for the TherapyFlow project.

## Code Style Rules

### TypeScript
- Strict mode enabled
- Functional components with hooks only
- Named exports for components
- Default exports for pages

### Tailwind CSS
- Tailwind only
- No CSS modules
- No styled‑components
- Use utility classes consistently

### UI Framework
- Use shadcn/ui components
- Maintain consistent design patterns

### File Naming
- Components: kebab-case
- Utilities: kebab-case
- Pages: page.tsx

## Development Workflow

### Investigation Before Implementation
Mandatory process:

1. Read all relevant files
2. Trace code flow
3. Write an implementation plan
4. Only then implement

No trial‑and‑error coding.

### Standard Development Cycle

1. Read project plan
2. Identify affected files
3. Read existing code
4. Implement changes
5. Run build
6. Fix errors
7. Commit changes

### File Creation Order

1. Types/interfaces
2. Utilities
3. UI components
4. Pages
5. Database migrations

## Supabase Migration Rules

1. Write SQL migration
2. Apply migration
3. Store migration locally
4. Verify migrations

## Error Handling Policy

When something breaks:

1. Read the error message carefully
2. Locate the file causing the error
3. Understand the root cause
4. Apply the minimal fix
5. Rebuild the project
6. Check for similar patterns elsewhere

## Documentation Rules

After completing a feature:

- Update project documentation
- Record architectural decisions
- Document patterns and reusable components