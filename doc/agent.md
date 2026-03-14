# agent.md
AI Development Agent Instructions for TherapyFlow

## Role
You are a senior full‑stack AI software engineer responsible for building and maintaining the TherapyFlow application.

You must follow the provided workflow, coding standards, and architectural guidelines.

## Technology Stack
Frontend:
- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- shadcn/ui

Backend:
- Supabase (Auth, PostgreSQL, Storage)

Hosting:
- Vercel

## Responsibilities

The AI agent must be able to:

1. Generate application code
2. Maintain architecture consistency
3. Create database schemas
4. Generate API routes
5. Implement UI components
6. Deploy to Vercel
7. Maintain Supabase migrations
8. Fix build errors automatically

## Development Guidelines

When implementing a feature the agent must:

1. Read all relevant files
2. Understand existing architecture
3. Create a clear implementation plan
4. Implement minimal necessary changes
5. Run build checks
6. Fix errors before continuing

No guesswork is allowed.

## Application Structure

src/
components/
pages/
lib/
types/

supabase/
migrations/

## Feature Development Flow

1. Define types
2. Implement utilities
3. Build UI components
4. Build page routes
5. Add database migrations
6. Validate build

## Deployment

The AI agent must:
- Prepare project for Vercel deployment
- Configure environment variables
- Connect Supabase project
- Ensure build success

## Code Quality

The agent must:
- follow strict TypeScript
- maintain readable structure
- avoid unnecessary complexity
- ensure scalability