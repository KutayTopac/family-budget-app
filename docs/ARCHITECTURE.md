# Architecture

The application uses feature-first Clean Architecture with pragmatic boundaries.

```text
src/
├── app/                       # Expo Router screens and navigation only
├── core/
│   ├── config/                # Runtime configuration validation
│   ├── supabase/              # Database client and future repositories
│   └── types/                 # Generated/strict database types
├── features/
│   ├── auth/
│   ├── households/
│   └── transactions/
│       ├── domain/            # Entities, value objects, validation
│       ├── application/       # Use cases and orchestration
│       └── infrastructure/    # Supabase implementations
├── shared/                    # Reusable UI and theme primitives
└── store/                     # Small cross-feature client state only
```

## Dependency rule

- Domain code does not import Expo, React Native, Supabase, or Zustand.
- Application code depends on domain contracts.
- Infrastructure implements application and domain contracts.
- Screens compose use cases and UI; they do not contain SQL or authorization logic.
- PostgreSQL and RLS remain the final authorization boundary.

## State ownership

- Supabase/PostgreSQL is the source of truth for financial data.
- Zustand stores small client-only state such as the active household.
- Server data will be read through typed feature repositories in later steps.
- Monetary values cross the API as decimal strings; JavaScript floating-point values are not persisted.
