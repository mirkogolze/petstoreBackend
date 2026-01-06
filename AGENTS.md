# AGENTS.md

## Purpose

This file centralizes global rules and best practices for implementing the TypeScript backend for this repository, based on the OpenAPI contract in [`openapi/petstore.yml`](openapi/petstore.yml:1).

## Scope

Applies to all backend code, tests, CI, and database schemas produced for the Petstore API.

## Tech stack (chosen)

- Node.js: Node 22 LTS
- TypeScript: strict mode (see tsconfig.json)
- Framework: Fastify + fastify-openapi-glue
- ORM: Prisma
- Database: SQLite for local development and tests; PostgreSQL for production

## Rationale for database choice

- SQLite: zero-config, fast for tests and local dev, file-based backups.
- PostgreSQL: production-grade, scalable, supports advanced features.
- Prisma: excellent TypeScript DX and type-safe client supporting both SQLite and Postgres.

## Folder structure

- src/
  - services/
  - utils/
- prisma/
- openapi/ (OpenAPI spec - single source of truth)
- tests/

## Coding standards

- Enable "strict": true, noImplicitAny, strictNullChecks in tsconfig.json.
- Prefer explicit types and generics; avoid any.
- Single responsibility: controllers thin, services hold business logic.
- Use OpenAPI-generated model classes and API classes.
- Use Prettier formatting and ESLint with typescript-eslint rules.

## OpenAPI-driven development (fastify-openapi-glue)

- **Source of truth**: [`openapi/petstore.yml`](openapi/petstore.yml:1) - all routes and validation are auto-generated from this file.
- **Route generation**: Using `fastify-openapi-glue` to auto-generate Fastify routes from OpenAPI spec.
- **Architecture flow**:
  ```
  openapi/petstore.yml 
    → fastify-openapi-glue (auto-generates routes & validation)
    → Service classes (business logic)
    → Prisma ORM
  ```

- **Validation**: Auto-generated from OpenAPI schemas by fastify-openapi-glue
- **Swagger UI**: Available at `/docs` endpoint
- **Zero drift**: Implementation always matches OpenAPI contract by design

## Validation and error handling

- **Automatic validation**: fastify-openapi-glue automatically validates requests/responses against OpenAPI schemas
- **AJV configuration**: Set `strict: false` in Fastify AJV options to support OpenAPI `example` keyword
- **Error handling**: Centralized in `src/services/openapiService.ts` and `src/utils/errorHandler.ts`
- **Error response format**:
  ```json
  { "code": "string", "message": "string", "details": null }
  ```

## Database and migrations (Prisma)

- Prisma schema: prisma/schema.prisma (example below).
- Use SQLite for dev: datasource db = "file:./dev.db"
- Commands:

```bash
npx prisma init
npx prisma migrate dev --name init
npx prisma db seed
```

## Testing

- Jest with ts-jest.
- Integration tests: supertest against an ephemeral SQLite DB or a test Postgres database.
- Include contract tests validating responses against OpenAPI.

## Linting, formatting, hooks

- ESLint (typescript-eslint) + Prettier.
- Husky + lint-staged for pre-commit: run lint, format, and tests for changed files.

## Security and ops

- Load secrets from environment variables; never commit secrets.
- Use helmet, rate-limiting, CORS, and input sanitization.
- Validate and sanitize user input; prefer parameterized queries.

## Terminal Conventions

> ⚠️ **Follow these rules strictly when running terminal commands.**

### Shell Preference
| OS | Preferred Shell |
|----|-----------------|
| Windows | **Git Bash** (not PowerShell, not cmd) |
| WSL, Linux | bash |
| macOS | zsh or bash |

#### Before Running Commands
1. **Check the current working directory** - Look at terminal context (`pwd`) before running commands
2. **Don't `cd` unnecessarily** - If already in the target folder, run commands directly
3. **Use absolute paths** when referencing files outside the current directory

## Useful commands

```bash
npx prisma init
npx prisma migrate dev --name init
npm test
```
