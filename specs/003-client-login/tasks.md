---

description: "Task list for 003-client-login"
---

# Tasks: Login e cadastro do cliente

**Input**: Design documents from `/specs/003-client-login/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Required. The constitution asks for 90% line coverage in every changed project, Storybook tests for shared components and Cypress E2E in a mobile viewport. Test tasks sit next to the code they cover.

**Organization**: Tasks are grouped by user story. Inside a story, they are grouped by project, in the order users-svc → BFF → frontend → E2E.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on unfinished tasks)
- **[Story]**: US1 to US4, from [spec.md](spec.md)
- Paths are relative to the workspace root `club-management-ai`
- Rules from 001 that are not repeated here still apply: hexagonal layers, one adapter per action, `[verb]-[feature]-[type]` file names, no `as`, `!`, `any`, `unknown` or `never` in TypeScript

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and project files needed by more than one story

- [X] T001 [P] Add `jose` to the runtime dependencies in services/club-management-users-svc/package.json and update package-lock.json
- [X] T002 [P] Add `react-router`, `i18next` and `react-i18next`, with the same versions as apps/club-management-admin/package.json, to apps/club-management-client/package.json and update package-lock.json
- [X] T003 [P] Move `httpx` to runtime dependencies, as in the admin BFF, in services/club-management-client-bff/requirements.txt
- [X] T004 [P] Add USERS_SVC_URL, TLS_CA, TLS_CERT and TLS_KEY, without real values, to services/club-management-client-bff/.env.example, and create the ignored services/club-management-client-bff/.env from it

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Changes every story depends on. No story work starts before this phase ends.

### servers/club-management-server

- [X] T005 Replace `APP_URL` with `ADMIN_APP_URL: ${ADMIN_APP_URL:-http://localhost:8081}` and `CLIENT_APP_URL: ${CLIENT_APP_URL:-http://localhost:8080}` in the users-svc service, and give client-bff `USERS_SVC_URL: https://users-svc:3001`, the TLS_* variables and `depends_on: users-svc`, in servers/club-management-server/docker-compose.yml
- [X] T006 Add ADMIN_APP_URL and CLIENT_APP_URL to servers/club-management-server/.env.example

### services/club-management-users-svc

- [X] T007 Replace `appUrl` with `adminAppUrl` (ADMIN_APP_URL) and `clientAppUrl` (CLIENT_APP_URL), both required, in services/club-management-users-svc/src/config/load-env-config.ts, update services/club-management-users-svc/src/config/load-env-config.test.ts, and update services/club-management-users-svc/.env.example and the ignored .env
- [X] T008 Make every email link use the app URL of the account type (ADMIN → adminAppUrl, CLIENT → clientAppUrl) in services/club-management-users-svc/src/infra/adapters/create-email-link-adapter.ts, passing the user type from the login and password reset usecases, and cover both types in the existing email adapter tests
- [X] T009 Add to the users schema: `passwordHash` no longer required (`default: null`), `emailVerifiedAt: Date | null` (`default: null`), `verificationEmailSentAt: Date | null` (`default: null`) and `socialIdentities: [{ provider: 'google' | 'facebook', subject: string, linkedAt: Date }]` (`default: []`), with a unique index on `{ 'socialIdentities.provider': 1, 'socialIdentities.subject': 1 }` using `partialFilterExpression: { 'socialIdentities.subject': { $exists: true } }` and not `sparse` (see data-model.md), in services/club-management-users-svc/src/infra/schemas/users-schema.ts
- [X] T010 Add `passwordHash: string | null`, `emailVerifiedAt: Date | null`, `verificationEmailSentAt: Date | null` and `socialIdentities: SocialIdentity[]` to `User`, and create `SocialProvider = 'google' | 'facebook'` with `toSocialProvider`, in services/club-management-users-svc/src/domain/models/user-model.ts and services/club-management-users-svc/src/domain/models/social-identity-model.ts, updating services/club-management-users-svc/src/domain/models/user-model.mock.ts and services/club-management-users-svc/src/infra/adapters/map-user-adapter.ts
- [X] T011 Make the login usecase treat `passwordHash: null` like an unknown email (check against the dummy hash, then `InvalidCredentialsError`), in services/club-management-users-svc/src/domain/usecases/login-user-usecase.ts, with a test in services/club-management-users-svc/src/domain/usecases/login-user-usecase.test.ts
- [X] T012 In the index step, set `emailVerifiedAt = createdAt` on ADMIN accounts without it, and make the seed create accounts already verified, with an optional `SEED_USER_TYPE` (`ADMIN` by default, or `CLIENT`) so E2E tests can create client accounts, in services/club-management-users-svc/src/config/run-seed-config.ts and services/club-management-users-svc/src/seed.ts, with tests in services/club-management-users-svc/src/config/run-seed-config.test.ts
- [X] T013 Create the middleware that reads `X-App-Type`, accepts only `ADMIN` or `CLIENT`, answers `400 invalid_request` otherwise and stores the value in `response.locals.appType`, in services/club-management-users-svc/src/application/middlewares/require-app-type-middleware.ts, with tests in services/club-management-users-svc/src/application/middlewares/require-app-type-middleware.test.ts
- [X] T014 Make require-auth answer `401 invalid_token` when the token `type` differs from `response.locals.appType` (research R11), in services/club-management-users-svc/src/application/middlewares/require-auth-middleware.ts, with tests in services/club-management-users-svc/src/application/middlewares/require-auth-middleware.test.ts
- [X] T015 Apply require-app-type to every route except `/health` in services/club-management-users-svc/src/config/create-app-config.ts, and send the header in services/club-management-users-svc/src/application/routes/test-app.mock.ts and in every existing route test

### services/club-management-admin-bff

- [X] T016 Send `X-App-Type: ADMIN` on every call to users-svc in services/club-management-admin-bff/src/infra/adapters/users_svc_adapters.py, with a test in services/club-management-admin-bff/tests/test_users_svc_adapters.py

### services/club-management-client-bff

- [X] T017 Create the mTLS client for users-svc, like the admin BFF, in services/club-management-client-bff/src/config/create_http_client_config.py, with tests in services/club-management-client-bff/tests/test_create_http_client_config.py
- [X] T018 Create `UpstreamError`, `JsonObject` and `ClientInfo` in services/club-management-client-bff/src/domain/ports/auth_ports.py, and the shared `_send` helper that adds `X-App-Type: CLIENT`, maps network failures to `503 service_unavailable` and repeats the users-svc error code, in services/club-management-client-bff/src/infra/adapters/users_svc_adapters.py, with tests in services/club-management-client-bff/tests/test_users_svc_adapters.py
- [X] T019 Register the UpstreamError handler, the validation handler that answers `400 invalid_request` without the input, and a configuration check at startup, in services/club-management-client-bff/src/config/create_app_config.py

### apps/club-management-client

- [X] T020 Create the theme with the light and dark tokens from research R15 (`background.default` `#F4F7F7`/`#16292D`, `background.paper` `#FFFFFF`/`#224248`, `text.primary` `#224248`/`#F4F7F7`, `text.secondary` `#325E6A`/`#EEF4F4`, `primary` `#224248`+`#FFFFFF`/`#44A1A4`+`#16292D`, `secondary` `#FF9A00`+`#224248`/`#FF9A00`+`#16292D`, links `#325E6A`/`#FF9A00`, focus `#44A1A4`) in apps/club-management-client/src/shared/theme/theme.ts, with tests in apps/club-management-client/src/shared/theme/theme.test.ts
- [X] T021 [P] Copy and adapt the color mode provider, context and storage from the admin in apps/club-management-client/src/shared/theme/ColorModeProvider.tsx, color-mode-context.ts and color-mode-storage.ts, with apps/club-management-client/src/shared/theme/ColorModeProvider.test.tsx
- [X] T022 [P] Copy and adapt i18n, with the same language key and session rules as the admin, in apps/club-management-client/src/shared/i18n/i18n.ts, pt-BR.json and en.json, with apps/club-management-client/src/shared/i18n/i18n.test.ts
- [X] T023 [P] Copy and adapt the session storage, the HTTP client with the Authorization header, user types and mocks in apps/club-management-client/src/shared/services/auth-token.ts, http-client.ts, user-types.ts and user.mock.ts, with their tests
- [X] T024 [P] Copy and adapt `useCurrentUser` and `useUpdatePreferences` in apps/club-management-client/src/shared/services/, with their tests
- [X] T025 [P] Copy and adapt `useSession`, `useSessionRenewal` and `usePreferencesSync` in apps/club-management-client/src/shared/hooks/, with their tests
- [X] T026 [P] Copy and adapt `validate-form` in apps/club-management-client/src/shared/utils/validate-form.ts, with its test
- [X] T027 [P] Copy and adapt LanguageSwitch, ThemeSwitch, PublicLayout and RouteGuards, each with `.tsx`, `.test.tsx` and `.stories.tsx`, in apps/club-management-client/src/shared/components/
- [X] T028 Set up the router, with `/login`, `/signup`, `/forgot-password`, `/verify-email`, `/confirm-social-link` and `/auth/callback` public (the first three under PublicOnly) and every other route under RequireAuth, wrapped in ColorModeProvider and AppSwrProvider, in apps/club-management-client/src/App.tsx, with tests in apps/club-management-client/src/App.test.tsx. Routes whose page does not exist yet render a placeholder until their story adds it

**Checkpoint**: the stack starts, the admin E2E suite still passes, and the client app shows its theme and router.

---

## Phase 3: User Story 1 - Entrar com email e senha (Priority: P1) 🎯 MVP

**Goal**: a client account logs in with email and password with every session, attempt, new location and password reset rule from 001.

**Independent Test**: with a client account created by `SEED_USER_TYPE=CLIENT`, log in with email and password and reach the home page, in both themes and both languages. An admin account gets the generic error.

### services/club-management-users-svc

- [X] T029 [US1] Test that login with `userType: CLIENT` rejects an ADMIN account with `invalid_credentials`, and that the email alerts link to clientAppUrl for CLIENT accounts, in services/club-management-users-svc/src/domain/usecases/login-user-usecase.test.ts and services/club-management-users-svc/src/application/routes/auth-route.test.ts

### services/club-management-client-bff

- [X] T030 [P] [US1] Create the adapters for login, refresh, forgot password, reset password, get current user and update preferences, one class per action like the admin BFF, in services/club-management-client-bff/src/infra/adapters/users_svc_adapters.py, with tests in services/club-management-client-bff/tests/test_users_svc_adapters.py
- [X] T031 [P] [US1] Create the Pydantic request and response models, with email up to 254 characters and password from 1 to 256, returning only the fields of contracts/client-bff-api.md, in services/club-management-client-bff/src/application/dto/auth_dto.py
- [X] T032 [US1] Create the auth usecases, sending `userType: CLIENT`, the IP from `X-Real-IP` and the user agent, and saving the missing session preferences after login, in services/club-management-client-bff/src/domain/usecases/auth_usecases.py, with tests in services/club-management-client-bff/tests/test_auth_usecases.py
- [X] T033 [US1] Create the controller and the routes `POST /auth/login`, `POST /auth/refresh`, `POST /auth/forgot-password` (202), `POST /auth/reset-password` (204), `GET /users/me` and `PATCH /users/me/preferences` in services/club-management-client-bff/src/application/controllers/auth_controller.py and services/club-management-client-bff/src/application/routes/auth_route.py, registered in services/club-management-client-bff/src/config/create_app_config.py, with tests in services/club-management-client-bff/tests/test_auth_route.py

### apps/club-management-client

- [X] T034 [P] [US1] Create the login form schema (email format up to 254 characters, password required) and `useLogin` with `useSWRMutation` in apps/club-management-client/src/pages/Login/services/login-form-schema.ts and useLogin.ts, with apps/club-management-client/src/pages/Login/services/useLogin.test.tsx
- [X] T035 [US1] Create LoginForm, with field errors, the generic error and the "forgot password" link, in apps/club-management-client/src/pages/Login/components/LoginForm.tsx, with LoginForm.test.tsx
- [X] T036 [US1] Create the login page inside PublicLayout, with LanguageSwitch and ThemeSwitch, in apps/club-management-client/src/pages/Login/index.tsx, with index.test.tsx
- [X] T037 [P] [US1] Copy and adapt the forgot password page, its forms, schemas and hooks from the admin, in apps/club-management-client/src/pages/ForgotPassword/, with their tests
- [X] T038 [P] [US1] Turn the home page into the landing point with the session renewal and the user name in apps/club-management-client/src/pages/Home/index.tsx, with index.test.tsx
- [X] T039 [US1] Add every login, password reset and session text in Portuguese and English in apps/club-management-client/src/shared/i18n/pt-BR.json and en.json

### e2e/club-management-client

- [X] T040 [US1] Create the helpers `createClientAccount` (seed with `SEED_USER_TYPE=CLIENT`), `visitInEnglish`, `signIn`, the Mailpit helpers and `readLinkPath(id, path)`, based on the admin ones, in e2e/club-management-client/cypress/support/helpers.ts
- [X] T041 [P] [US1] Test login, the protected route redirect, the generic error for wrong credentials and for an admin account, in e2e/club-management-client/cypress/e2e/login.cy.ts
- [X] T042 [P] [US1] Test the 3 attempts, the 15 minute lock and the single email in e2e/club-management-client/cypress/e2e/login-attempts.cy.ts
- [X] T043 [P] [US1] Test the password reset, with the link pointing to the client app, in e2e/club-management-client/cypress/e2e/forgot-password.cy.ts
- [X] T044 [P] [US1] Test the session renewal and the 12 hour limit in e2e/club-management-client/cypress/e2e/session.cy.ts
- [X] T045 [P] [US1] Test the new network email in e2e/club-management-client/cypress/e2e/new-location.cy.ts
- [X] T046 [P] [US1] Test that a client token is refused by the admin system and an admin token by the client system, in e2e/club-management-client/cypress/e2e/token-scope.cy.ts
- [X] T047 [P] [US1] Test the limit of 5 password reset requests in 24 hours, as in the admin suite, in e2e/club-management-client/cypress/e2e/forgot-password-limit.cy.ts
- [X] T048 [P] [US1] Test that client-bff and users-svc refuse callers without a valid certificate, as in the admin suite, in e2e/club-management-client/cypress/e2e/internal-tls.cy.ts

**Checkpoint**: US1 works on its own with seeded client accounts.

---

## Phase 4: User Story 2 - Criar uma conta (Priority: P1)

**Goal**: a person without an account signs up, confirms the email by link and logs in. One account per email, without revealing that an account exists.

**Independent Test**: without any account, follow the sign-up button, create the account, confirm the email in Mailpit and log in. Sign up again with the same email in capital letters: same message, no new account.

### services/club-management-users-svc

- [X] T049 [P] [US2] Create the emailVerificationTokens schema (`userId`, `tokenHash` unique, `expiresAt` "24 horas depois da criação" with a TTL index, `usedAt: Date | null`, `createdAt`) in services/club-management-users-svc/src/infra/schemas/email-verification-tokens-schema.ts
- [X] T050 [P] [US2] Create the registrationAttempts schema (`networkHash` unique, `count`, `expiresAt` "1 hora depois do primeiro cadastro da janela" with a TTL index) in services/club-management-users-svc/src/infra/schemas/registration-attempts-schema.ts
- [X] T051 [P] [US2] Add `EmailNotVerifiedError` (403 `email_not_verified`), `InvalidVerificationLinkError` (400 `invalid_verification_link`) and `TooManyRequestsError` (429 `too_many_requests`) in services/club-management-users-svc/src/domain/models/auth-errors-model.ts and map them in services/club-management-users-svc/src/application/middlewares/handle-error-middleware.ts, with tests in handle-error-middleware.test.ts
- [X] T052 [P] [US2] Add `EMAIL_VERIFICATION_LINK_HOURS = 24`, `VERIFICATION_RESEND_SECONDS = 60`, `MAXIMUM_REGISTRATIONS_PER_HOUR = 10` and `MAXIMUM_NAME_LENGTH = 100` in services/club-management-users-svc/src/domain/models/user-model.ts
- [X] T053 [US2] Create the input ports for register, verify email and resend verification in services/club-management-users-svc/src/domain/ports/registration-input-ports.ts, and the output ports for every adapter in this phase in services/club-management-users-svc/src/domain/ports/registration-output-ports.ts
- [X] T054 [P] [US2] Create create-client-user, always with `type: 'CLIENT'`, the normalized email, `emailVerifiedAt: null`, and returning `{ created: false, user }` on a duplicate key error, in services/club-management-users-svc/src/infra/adapters/create-client-user-adapter.ts
- [X] T055 [P] [US2] Create create-email-verification-token, invalidating the user's pending tokens and setting `verificationEmailSentAt`, in services/club-management-users-svc/src/infra/adapters/create-email-verification-token-adapter.ts
- [X] T056 [P] [US2] Create consume-email-verification-token, marking it used atomically only if unused and not expired, in services/club-management-users-svc/src/infra/adapters/consume-email-verification-token-adapter.ts
- [X] T057 [P] [US2] Create mark-email-verified, setting `emailVerifiedAt` only when it is null, in services/club-management-users-svc/src/infra/adapters/mark-email-verified-adapter.ts
- [X] T058 [P] [US2] Create invalidate-email-verification-tokens in services/club-management-users-svc/src/infra/adapters/invalidate-email-verification-tokens-adapter.ts
- [X] T059 [P] [US2] Create claim-verification-resend, which sets `verificationEmailSentAt` atomically only when it is null or older than 60 seconds and reports whether it did, in services/club-management-users-svc/src/infra/adapters/claim-verification-resend-adapter.ts
- [X] T060 [P] [US2] Create increment-registration-attempts, an atomic upsert per network hash that returns the count in the window and restarts the count when `expiresAt` has passed but the TTL has not deleted the document yet, in services/club-management-users-svc/src/infra/adapters/increment-registration-attempts-adapter.ts
- [X] T061 [P] [US2] Create send-verification-email, in Portuguese and English, with the link `{CLIENT_APP_URL}/verify-email?token=…`, in services/club-management-users-svc/src/infra/adapters/send-verification-email-adapter.ts, with services/club-management-users-svc/src/infra/adapters/send-verification-email-adapter.test.ts
- [X] T062 [P] [US2] Create send-signup-attempt-email, in Portuguese and English, with the login and password reset links of the account's app, in services/club-management-users-svc/src/infra/adapters/send-signup-attempt-email-adapter.ts, with services/club-management-users-svc/src/infra/adapters/send-signup-attempt-email-adapter.test.ts
- [X] T063 [US2] Test the database adapters of this phase against mongodb-memory-server, including two simultaneous sign-ups with the same email creating one account, in services/club-management-users-svc/src/infra/adapters/registration-adapters.test.ts
- [X] T064 [US2] Create register-client: limit by network (`MAXIMUM_REGISTRATIONS_PER_HOUR`, skipped without IP), password rule of 8 characters, hash always computed, create the account, and in the background send the verification email (new account), resend it within the 60 second limit (unverified client) or send the sign-up attempt email (verified client or admin), always returning the same result, in services/club-management-users-svc/src/domain/usecases/register-client-usecase.ts
- [X] T065 [P] [US2] Test register-client, including the existing account cases, same response and timing path, the rate limit, a weak password and the race, in services/club-management-users-svc/src/domain/usecases/register-client-usecase.test.ts
- [X] T066 [US2] Create verify-email: consume the token, set `emailVerifiedAt`, or throw `InvalidVerificationLinkError` for unknown, expired or used links, in services/club-management-users-svc/src/domain/usecases/verify-email-usecase.ts, with services/club-management-users-svc/src/domain/usecases/verify-email-usecase.test.ts
- [X] T067 [US2] Create resend-verification: only for an unverified CLIENT account and at most once per 60 seconds, never revealing the account, running in the background, in services/club-management-users-svc/src/domain/usecases/resend-verification-usecase.ts, with services/club-management-users-svc/src/domain/usecases/resend-verification-usecase.test.ts
- [X] T068 [US2] Make login throw `EmailNotVerifiedError` only after the right password for a CLIENT account with `emailVerifiedAt: null`, without counting it as a failure, in services/club-management-users-svc/src/domain/usecases/login-user-usecase.ts, with tests in login-user-usecase.test.ts
- [X] T069 [US2] Make the password reset also set `emailVerifiedAt` when null and invalidate the pending verification tokens, in services/club-management-users-svc/src/domain/usecases/reset-password-usecase.ts and services/club-management-users-svc/src/infra/adapters/update-user-password-adapter.ts, with tests
- [X] T070 [US2] Create the DTOs for register (`name` trimmed 1 to 100 characters, `email` up to 254, `password` 1 to 256, `language` and `ip` optional, strict, no type field), verify email (`token` 1 to 256) and resend (`email`, `language` optional) in services/club-management-users-svc/src/application/dto/registration-dto.ts
- [X] T071 [US2] Create the controller and routes `POST /auth/register` (202, only with `X-App-Type: CLIENT`, otherwise 404), `POST /auth/verify-email` (204) and `POST /auth/resend-verification` (202) in services/club-management-users-svc/src/application/controllers/registration-controller.ts and services/club-management-users-svc/src/application/routes/registration-route.ts, wired in services/club-management-users-svc/src/config/create-app-config.ts and services/club-management-users-svc/src/main.ts, with Supertest tests in services/club-management-users-svc/src/application/routes/registration-route.test.ts
- [X] T072 [US2] Create the new indexes at startup in the index step of services/club-management-users-svc/src/config/run-seed-config.ts

### services/club-management-client-bff

- [X] T073 [P] [US2] Create the register, verify email and resend verification adapters in services/club-management-client-bff/src/infra/adapters/users_svc_adapters.py, with tests
- [X] T074 [US2] Add the register, verify email and resend usecases, sending the IP from `X-Real-IP` with the sign-up, in services/club-management-client-bff/src/domain/usecases/auth_usecases.py, with tests
- [X] T075 [US2] Add the DTOs and the routes `POST /auth/register` (202), `POST /auth/verify-email` (204) and `POST /auth/resend-verification` (202) in services/club-management-client-bff/src/application/dto/auth_dto.py, controllers/auth_controller.py and routes/auth_route.py, with tests in services/club-management-client-bff/tests/test_auth_route.py

### apps/club-management-client

- [X] T076 [P] [US2] Create the sign-up form schema (name 1 to 100 characters, email format up to 254, password at least 8 characters, confirmation equal to the password) and `useSignUp` in apps/club-management-client/src/pages/SignUp/services/sign-up-form-schema.ts and useSignUp.ts, with tests
- [X] T077 [US2] Create SignUpForm, with field errors and a submit button disabled while sending so a double submit sends once, in apps/club-management-client/src/pages/SignUp/components/SignUpForm.tsx, with SignUpForm.test.tsx
- [X] T078 [US2] Create CheckEmailNotice, shown after any accepted sign-up, with the resend button, in apps/club-management-client/src/pages/SignUp/components/CheckEmailNotice.tsx, with CheckEmailNotice.test.tsx
- [X] T079 [US2] Create the sign-up page inside PublicLayout, with a link back to login, in apps/club-management-client/src/pages/SignUp/index.tsx, with index.test.tsx
- [X] T080 [US2] Create the verify email page, which posts the token only once per token when it opens, even when StrictMode mounts the page twice (for example with `useSWRImmutable` keyed by the token, or a ref guard), and shows success with a button to login, or the invalid link message with the resend form, in apps/club-management-client/src/pages/VerifyEmail/index.tsx, services/useVerifyEmail.ts and components/, with tests that include mounting the page twice
- [X] T081 [US2] Add the sign-up button (secondary color) to the login page, and the email not verified notice with the resend button when login returns `email_not_verified`, in apps/club-management-client/src/pages/Login/index.tsx and components/, with tests. The resend hook is used by Login, SignUp and VerifyEmail, so promote it to apps/club-management-client/src/shared/services/useResendVerification.ts, with the Zod schema of its email form (email format up to 254 characters) in apps/club-management-client/src/shared/services/resend-verification-form-schema.ts, both with tests
- [X] T082 [US2] Add every sign-up and verification text in Portuguese and English in apps/club-management-client/src/shared/i18n/pt-BR.json and en.json
- [X] T083 [US2] Replace the placeholders of `/signup` and `/verify-email` with the pages in apps/club-management-client/src/App.tsx

### e2e/club-management-client

- [X] T084 [P] [US2] Test sign-up, the blocked login before confirming, the resend, the link and the login after it, in e2e/club-management-client/cypress/e2e/sign-up.cy.ts
- [X] T085 [P] [US2] Test a sign-up with an existing email in other casing: same message, sign-up attempt email, one account, in e2e/club-management-client/cypress/e2e/sign-up-existing.cy.ts
- [X] T086 [P] [US2] Test field errors, an expired or used verification link, and the sign-up limit per network, in e2e/club-management-client/cypress/e2e/sign-up-errors.cy.ts

### e2e/club-management-admin

- [X] T087 [US2] Test that the admin login has no sign-up, Google or Facebook button, in e2e/club-management-admin/cypress/e2e/no-sign-up.cy.ts

**Checkpoint**: US1 and US2 work together. MVP ready.

---

## Phase 5: User Story 3 - Entrar com Google ou Facebook (Priority: P2)

**Goal**: a client enters with Google or Facebook, on mobile and desktop, landing in the single account of that email. The first Facebook entry of each identity only links or creates the account after the email confirmation (FR-014c).

**Independent Test**: with the mock provider, enter with Google and reach the home page. Enter with Facebook, confirm the link in Mailpit and reach the home page. Repeat both with the same email to see the same account, with no new email for Facebook. Cancel, no email and admin email show their messages.

### servers/club-management-infra

- [X] T088 [US3] Create the mock provider following contracts/oauth-mock.md (Google authorize, token and JWKS; Facebook dialog, access_token and me with appsecret_proof; the form; one-time codes with PKCE and redirect_uri checks; `POST /control/fail-next`) in servers/club-management-infra/oauth-mock/main.py, templates/authorize.html and requirements.txt, without a Dockerfile
- [X] T089 [P] [US3] Test the mock provider with pytest in servers/club-management-infra/oauth-mock/tests/test_main.py
- [X] T090 [US3] Add the `oauth-mock` service, on the `python:3.14-slim` image running `pip install -r requirements.txt` and uvicorn on start like the BFFs, port `${OAUTH_MOCK_PORT:-8090}`, with `--reload`, the source folder mounted and a health check, in servers/club-management-infra/docker-compose.yml, and document it in servers/club-management-infra/README.md and servers/club-management-infra/.env.example
- [X] T091 [US3] Run the oauth-mock tests and lint in .github/workflows/infra.yml

### servers/club-management-server

- [X] T092 [US3] Pass the GOOGLE_* and FACEBOOK_* variables from contracts/users-svc-api.md to users-svc, defaulting to the mock (browser URL on `http://localhost:8090`, server URLs on `http://oauth-mock:8090`), and make users-svc depend on oauth-mock, in servers/club-management-server/docker-compose.yml, and list them, with the real URLs commented, in servers/club-management-server/.env.example

### services/club-management-users-svc

- [X] T093 [P] [US3] Create the oauthStates schema (`stateHash` unique, `bindingHash`, `provider` `google` or `facebook`, `codeVerifier`, `nonce: string | null`, `language`, `expiresAt` "10 minutos" with a TTL index, `usedAt: Date | null`) in services/club-management-users-svc/src/infra/schemas/oauth-states-schema.ts
- [X] T094 [P] [US3] Create the socialLoginCodes schema (`codeHash` unique, `userId`, `expiresAt` "60 segundos" with a TTL index, `usedAt: Date | null`) in services/club-management-users-svc/src/infra/schemas/social-login-codes-schema.ts
- [X] T094a [P] [US3] Create the socialLinkRequests schema (`tokenHash` unique, `provider` `facebook`, `subject`, `email` normalized with an index on `{ email: 1, createdAt: -1 }` for the 1 minute and 24 hour limits, `profileName` up to 100 characters, `language`, `expiresAt` "24 horas" with a TTL index, `usedAt: Date | null`, `createdAt`) in services/club-management-users-svc/src/infra/schemas/social-link-requests-schema.ts
- [X] T094b [P] [US3] Create the socialLinkAttempts schema, with the same fields and TTL as registrationAttempts (`networkHash` unique, `count`, `expiresAt` "1 hora"), in services/club-management-users-svc/src/infra/schemas/social-link-attempts-schema.ts
- [X] T095 [P] [US3] Add the optional GOOGLE_* (with `GOOGLE_ISSUERS` as a comma separated list) and FACEBOOK_* variables with the defaults from contracts/users-svc-api.md, treating a provider without credentials as not configured, in services/club-management-users-svc/src/config/load-env-config.ts, with tests, and add them to services/club-management-users-svc/.env.example with the mock values
- [X] T096 [P] [US3] Add `InvalidStateError` (400 `invalid_state`), `SocialLoginCancelledError` (400 `cancelled`), `EmailRequiredError` (400 `email_required`), `ProviderUnavailableError` (502, or 503 when not configured, `provider_unavailable`), `InvalidSocialCodeError` (401 `invalid_social_code`) and `InvalidSocialLinkError` (400 `invalid_social_link`) in services/club-management-users-svc/src/domain/models/auth-errors-model.ts, mapped in handle-error-middleware.ts, with tests
- [X] T097 [US3] Create the input ports for start social login, complete social login (returning a session code or `pending: email_confirmation`), exchange social code, and preview, confirm and decline social link in services/club-management-users-svc/src/domain/ports/social-login-input-ports.ts, and the output ports for every adapter in this phase, including `ProviderIdentity = { provider, subject, email, emailVerified, name }`, where `emailVerified` comes from the Google `id_token` and is always `false` for Facebook, in services/club-management-users-svc/src/domain/ports/social-login-output-ports.ts
- [X] T098 [P] [US3] Create generate-pkce (verifier and S256 challenge), generate-oauth-state and generate-nonce in services/club-management-users-svc/src/infra/adapters/generate-pkce-adapter.ts, generate-oauth-state-adapter.ts and generate-nonce-adapter.ts
- [X] T099 [P] [US3] Create build-google-authorization-url (with `nonce` and `prompt=select_account`) and build-facebook-authorization-url (with FACEBOOK_SCOPE) in services/club-management-users-svc/src/infra/adapters/build-google-authorization-url-adapter.ts and build-facebook-authorization-url-adapter.ts
- [X] T100 [P] [US3] Create create-oauth-state and consume-oauth-state (atomic, checking `stateHash`, `bindingHash`, `provider`, expiry and `usedAt`) in services/club-management-users-svc/src/infra/adapters/create-oauth-state-adapter.ts and consume-oauth-state-adapter.ts
- [X] T101 [P] [US3] Create exchange-google-code and verify-google-id-token (with `jose` and a remote JWKS: signature, issuer, `aud`, `exp`, `nonce`; responses validated with Zod) in services/club-management-users-svc/src/infra/adapters/exchange-google-code-adapter.ts and verify-google-id-token-adapter.ts
- [X] T102 [P] [US3] Create exchange-facebook-code and get-facebook-profile (with `appsecret_proof` = HMAC-SHA256 of the token with the App Secret, `fields=id,name,email`, responses validated with Zod, the token never stored) in services/club-management-users-svc/src/infra/adapters/exchange-facebook-code-adapter.ts and get-facebook-profile-adapter.ts
- [X] T103 [P] [US3] Create find-user-by-social-identity in services/club-management-users-svc/src/infra/adapters/find-user-by-social-identity-adapter.ts
- [X] T104 [P] [US3] Create link-social-identity (adds the identity only if that provider is not linked yet) in services/club-management-users-svc/src/infra/adapters/link-social-identity-adapter.ts
- [X] T104a [P] [US3] Create replace-social-identity (in one update, removes the identity of that provider and adds the new one, used by the Facebook confirmation) in services/club-management-users-svc/src/infra/adapters/replace-social-identity-adapter.ts
- [X] T105 [P] [US3] Create claim-unverified-account (research R7: in one update, only while `emailVerifiedAt` is null, set it, set `passwordHash: null` and raise `tokenVersion`) in services/club-management-users-svc/src/infra/adapters/claim-unverified-account-adapter.ts. When it claims, the usecase also invalidates the pending verification tokens (T058) and password reset tokens of the account, through a new invalidate-password-reset-tokens adapter in services/club-management-users-svc/src/infra/adapters/invalidate-password-reset-tokens-adapter.ts
- [X] T106 [P] [US3] Create create-social-client-user (`type: 'CLIENT'`, `passwordHash: null`, `emailVerifiedAt` set, the identity linked, `language` received as a parameter (from the oauthState for Google, from the link request for Facebook), `{ created: false }` on a duplicate key) in services/club-management-users-svc/src/infra/adapters/create-social-client-user-adapter.ts
- [X] T107 [P] [US3] Create create-social-login-code and consume-social-login-code in services/club-management-users-svc/src/infra/adapters/create-social-login-code-adapter.ts and consume-social-login-code-adapter.ts
- [X] T107a [P] [US3] Create count-recent-social-link-requests (requests for an email since a given date, used for the 1 minute and the 5 in 24 hours limits), create-social-link-request (marks the unused requests of the same provider and subject as used, stores the new one and returns its token; it is only called when the usecase decided to send), find-social-link-request (valid, unused, by token hash) and consume-social-link-request (atomic `usedAt`, used by confirm and decline) in services/club-management-users-svc/src/infra/adapters/count-recent-social-link-requests-adapter.ts, create-social-link-request-adapter.ts, find-social-link-request-adapter.ts and consume-social-link-request-adapter.ts
- [X] T107c [P] [US3] Create increment-social-link-attempts, the same atomic upsert per network hash of T060 on socialLinkAttempts, in services/club-management-users-svc/src/infra/adapters/increment-social-link-attempts-adapter.ts
- [X] T107b [P] [US3] Create send-social-link-email (Portuguese and English, the Facebook profile name, the link `{CLIENT_APP_URL}/confirm-social-link?token=…`, and the text to ignore it if it was not the person) in services/club-management-users-svc/src/infra/adapters/send-social-link-email-adapter.ts, with tests in the existing email adapter tests
- [X] T108 [US3] Test the provider adapters against a local fake HTTP server, including forged and expired `id_token`, wrong `aud`, wrong `nonce`, wrong `appsecret_proof` and malformed responses, in services/club-management-users-svc/src/infra/adapters/social-provider-adapters.test.ts
- [X] T109 [US3] Test the database adapters of this phase against mongodb-memory-server, including two users without any identity (the partial unique index must accept them), a reused state, a reused code, two simultaneous first logins with the same email, a new link request invalidating the previous one, the recent request count, the network counter, replacing a Facebook identity and two simultaneous confirmations of the same link, in services/club-management-users-svc/src/infra/adapters/social-login-adapters.test.ts
- [X] T110 [US3] Create start-social-login: check the provider is configured, create state, PKCE and nonce, store the state with the binding hash and language, return the URL, in services/club-management-users-svc/src/domain/usecases/start-social-login-usecase.ts, with services/club-management-users-svc/src/domain/usecases/start-social-login-usecase.test.ts
- [X] T111 [US3] Create complete-social-login following the steps in contracts/users-svc-api.md: consume the state, map the provider error, exchange and verify, require an email (and `emailVerified` only for Google), find by identity; for Facebook without a linked identity, always return `pending: email_confirmation` without linking, creating or opening a session, and only create the link request and send the email when the email is not an ADMIN, no request for that email was created in the last minute, fewer than 5 in 24 hours, and the network count is at most 10 per hour (research R5a); for Google, find by normalized email, reject ADMIN with `invalid_credentials`, then link or claim (R7) or create; check the new network like the password login without touching the attempts or the lock (R13), create the exchange code, in services/club-management-users-svc/src/domain/usecases/complete-social-login-usecase.ts
- [X] T112 [P] [US3] Test complete-social-login, covering every row and column of the account states table in data-model.md, both providers, Facebook never linking or creating without the confirmation, a linked Facebook identity entering directly, an admin email on Facebook answering pending with no request and no email, a second request within 1 minute keeping the first link, the 24 hour and network limits answering pending without sending, cancel, missing or unverified email, admin email, reused state, provider failure, the race on creation, a locked account and the new network email, in services/club-management-users-svc/src/domain/usecases/complete-social-login-usecase.test.ts
- [X] T112a [US3] Create preview-social-link (returns provider, profile name and email, without changing anything), confirm-social-link (consumes the request atomically, then applies research R6 with the request email: ADMIN → `InvalidSocialLinkError`, client → link the identity, or replace the Facebook identity already linked (T104a), and claim if unverified (R7), no account → create a verified client without password with the identity and the request language; a duplicate identity → `InvalidSocialLinkError`) and decline-social-link (consumes the request, always succeeds) in services/club-management-users-svc/src/domain/usecases/preview-social-link-usecase.ts, confirm-social-link-usecase.ts and decline-social-link-usecase.ts
- [X] T112b [P] [US3] Test the three social link usecases, covering every account state, an expired, used or declined link, an admin email, the identity linked elsewhere meanwhile, the replacement of another linked Facebook identity, the claim invalidating pending verification and reset links, and a declined link that links nothing, in services/club-management-users-svc/src/domain/usecases/social-link-usecases.test.ts
- [X] T113 [US3] Create exchange-social-code: consume the code, load the user, open a session with a new `sid` and the 001 rules, in services/club-management-users-svc/src/domain/usecases/exchange-social-code-usecase.ts, with services/club-management-users-svc/src/domain/usecases/exchange-social-code-usecase.test.ts
- [X] T114 [US3] Create the DTOs for authorization (`binding`, `language` optional), callback (`binding`, `state`, `code` and `error` optional, `ip`, `userAgent`), session (`code`) and social link (`token`) in services/club-management-users-svc/src/application/dto/social-login-dto.ts
- [X] T115 [US3] Create the controller and the routes `POST /auth/social/:provider/authorization`, `POST /auth/social/:provider/callback` (`200` with the code or `202` pending), `POST /auth/social/session` and `POST /auth/social/link/preview`, `/confirm` and `/decline`, only with `X-App-Type: CLIENT` and `404` for an unknown provider, in services/club-management-users-svc/src/application/controllers/social-login-controller.ts and services/club-management-users-svc/src/application/routes/social-login-route.ts, wired in create-app-config.ts and main.ts, with Supertest tests in services/club-management-users-svc/src/application/routes/social-login-route.test.ts
- [X] T116 [US3] Create the indexes of oauthStates, socialLoginCodes, socialLinkRequests and socialLinkAttempts at startup in services/club-management-users-svc/src/config/run-seed-config.ts

### services/club-management-client-bff

- [X] T117 [P] [US3] Create the social authorization, callback (code or pending), session and social link preview, confirm and decline adapters in services/club-management-client-bff/src/infra/adapters/users_svc_adapters.py, with tests
- [X] T118 [US3] Create the social login usecases: start (random binding, URL from users-svc), callback (forward code, state, error, binding, IP and user agent; return the frontend path `/auth/callback#code=…`, `/login?social_notice=check_email` when users-svc answers pending, or `/login?social_error=<code>`, mapping unknown errors to `provider_unavailable`) session (exchange and save missing preferences) and social link preview, confirm and decline (forwarded as they are) in services/club-management-client-bff/src/domain/usecases/social_login_usecases.py, with services/club-management-client-bff/tests/test_social_login_usecases.py
- [X] T119 [US3] Create the controller and routes `GET /auth/{provider}/start`, `GET /auth/{provider}/callback`, `POST /auth/social/session` and `POST /auth/social/link/preview`, `/confirm` and `/decline`, with the `oauth_binding` cookie (`HttpOnly`, `SameSite=Lax`, `Path=/api/auth/`, `Max-Age=600`, `Secure` when CLIENT_APP_URL is https) set on start and deleted on callback, `302` responses and `404` for an unknown provider, in services/club-management-client-bff/src/application/controllers/social_login_controller.py and services/club-management-client-bff/src/application/routes/social_login_route.py, registered in create_app_config.py, with services/club-management-client-bff/tests/test_social_login_route.py
- [X] T120 [US3] Add CLIENT_APP_URL to the client BFF in services/club-management-client-bff/.env.example and servers/club-management-server/docker-compose.yml

### apps/club-management-client

- [X] T121 [P] [US3] Create the Google and Facebook logo components, as inline SVG, in apps/club-management-client/src/pages/Login/components/GoogleLogo.tsx and FacebookLogo.tsx
- [X] T122 [US3] Create SocialLoginButtons, two outlined full-width buttons that navigate in the same tab to `/api/auth/{provider}/start?language=…`, in apps/club-management-client/src/pages/Login/components/SocialLoginButtons.tsx, with SocialLoginButtons.test.tsx and SocialLoginButtons.stories.tsx
- [X] T123 [US3] Show the translated message for `social_error` (`cancelled`, `email_required`, `invalid_credentials`, `provider_unavailable`, `invalid_state`) and the info notice for `social_notice=check_email`, and remove the parameter from the URL, in apps/club-management-client/src/pages/Login/index.tsx, with tests
- [X] T124 [US3] Create the social callback page: read the code from the fragment, clear the fragment, exchange it only once per code, even when StrictMode mounts the page twice, with `useSWRMutation` sending the session theme and language, save the session and go home, or go to `/login?social_error=invalid_state` on failure, in apps/club-management-client/src/pages/SocialCallback/index.tsx and services/useSocialSession.ts, with tests that include mounting the page twice
- [X] T124a [US3] Create the confirm social link page: read the token, load the preview with `useSWRImmutable` keyed by the token (a read, so no `useEffect` fetch), show the Facebook profile name and the email with the buttons Confirmar and "Não fui eu" (nothing is confirmed just by opening), which call confirm and decline with `useSWRMutation`, then show the result: confirmed with "Continuar com Facebook" and a link to login, declined, or invalid link with a way to start the Facebook entry again, in apps/club-management-client/src/pages/ConfirmSocialLink/index.tsx, components/ and services/, with tests that include mounting the page twice
- [X] T125 [US3] Add the social login and Facebook confirmation texts in Portuguese and English, including "Continuar com Google" and "Continuar com Facebook", in apps/club-management-client/src/shared/i18n/pt-BR.json and en.json
- [X] T126 [US3] Replace the placeholders of `/auth/callback` and `/confirm-social-link` with their pages in apps/club-management-client/src/App.tsx

### e2e/club-management-client

- [X] T127 [US3] Add the helper `confirmAtMockProvider(options)`, using `cy.origin('http://localhost:8090', …)` to fill and submit the mock form, in e2e/club-management-client/cypress/support/helpers.ts
- [X] T128 [P] [US3] Test a first Google login creating a verified account, a second one reaching the same account, and Facebook with the same email reaching it too only after confirming the link in Mailpit, with the next Facebook entry going in directly, in e2e/club-management-client/cypress/e2e/social-login.cy.ts
- [X] T129 [P] [US3] Test linking to an existing password account, and the claim of an unverified account where the old password stops working, for Google and for Facebook after the link, in e2e/club-management-client/cypress/e2e/social-link.cy.ts
- [X] T130 [P] [US3] Test cancel, Facebook without email, an admin email on Google (generic error) and on Facebook (check email notice and no email in Mailpit), a provider failure, and a callback replayed with the same state, in e2e/club-management-client/cypress/e2e/social-errors.cy.ts
- [X] T130a [P] [US3] Test the Facebook confirmation: no session and no account before confirming, the notice on the login page, opening the link not confirming anything, "Não fui eu" linking nothing, a second request within 1 minute sending no new email and keeping the first link valid, a later request invalidating the previous link, a second Facebook profile with the same email replacing the first after confirmation, and an expired or reused link, in e2e/club-management-client/cypress/e2e/social-facebook-confirmation.cy.ts
- [X] T131 [P] [US3] Test the password reset on an account created by Google, and both ways of entering working afterwards, in e2e/club-management-client/cypress/e2e/social-password.cy.ts

**Checkpoint**: US1, US2 and US3 work together.

---

## Phase 6: User Story 4 - Aparência do cliente (Priority: P2)

**Goal**: every screen uses the client palette, in both themes and both languages, at 390 px and 1280 px.

**Independent Test**: open every screen in both themes and both languages, at 390 px and 1280 px, with no horizontal scroll and the accessibility checks passing.

- [X] T132 [P] [US4] Add a test that pt-BR.json and en.json have exactly the same keys and no empty values, in apps/club-management-client/src/shared/i18n/i18n.test.ts
- [X] T133 [P] [US4] Add contrast tests for every text and component pair of research R15, in both modes, in apps/club-management-client/src/shared/theme/theme.test.ts
- [X] T134 [P] [US4] Run every story in light and dark, with the axe check including contrast, in apps/club-management-client/.storybook/preview.tsx and apps/club-management-client/.storybook/test-runner.ts
- [X] T135 [P] [US4] Add stories with `Default`, `Loading`, `Error` and `MobileViewport` for LoginForm, SignUpForm, CheckEmailNotice, the VerifyEmail states and the ConfirmSocialLink states, in the `components/` folder of each page in apps/club-management-client/src/pages/
- [X] T136 [US4] Test every public page at 390 px and 1280 px, in both themes and both languages, with no horizontal scroll and the palette colors applied, in e2e/club-management-client/cypress/e2e/responsive.cy.ts
- [X] T137 [US4] Test that the theme and language choices survive a reload and are saved on the user after login, as in the admin, in e2e/club-management-client/cypress/e2e/preferences.cy.ts

**Checkpoint**: every story works and every screen meets the appearance rules.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T138 [P] Document the client app, the sign-up, the mock provider at http://localhost:8090 and how to use the real providers in README.md
- [X] T139 [P] Document the pages, routes and commands in apps/club-management-client/README.md
- [X] T140 Remove the old `api.cy.ts` check if the new suites replace it, and update home.cy.ts for the protected home page, in e2e/club-management-client/cypress/e2e/
- [X] T141 Run lint, type check and coverage of at least 90% lines in services/club-management-users-svc, services/club-management-client-bff, services/club-management-admin-bff, apps/club-management-client and servers/club-management-infra/oauth-mock, and fix what fails
- [X] T142 Run the full E2E suites in e2e/club-management-client and e2e/club-management-admin against `npm run dev -- --detach` and fix what fails
- [ ] T143 Run the manual script in specs/003-client-login/quickstart.md, including the real Google and Facebook section with the credentials of .secrets.env, and record the result in specs/003-client-login/quickstart.md — Omitted: needs the real Google and Facebook credentials of .secrets.env, real accounts and a person confirming at the providers; the automated suites ran against the mock provider
- [X] T144 Check that no .env, .secrets.env, certificate or credential is tracked in any affected repository

---

## Dependencies & Execution Order

### Phases

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup. Blocks every story.
- **US1 (Phase 3)**: depends on Foundational.
- **US2 (Phase 4)**: depends on Foundational. Its users-svc and BFF parts are independent of US1. T081 changes the login page from US1 (T036), so it waits for it.
- **US3 (Phase 5)**: depends on Foundational. T123 changes the login page from US1 (T036). The E2E link tests (T129) use the sign-up from US2.
- **US4 (Phase 6)**: depends on the pages of US1, US2 and US3.
- **Polish (Phase 7)**: depends on every story.

### Inside a story

- users-svc: schemas, errors and ports → adapters → adapter tests → usecases → DTOs → routes.
- BFF: adapters → usecases → routes.
- Frontend: schemas and hooks → components → page → texts → App routes.
- E2E: after the stack runs the story.

## Parallel Examples

### Phase 2

```text
T021, T022, T023, T024, T025, T026 and T027 (different folders of the client app)
T013 and T016 (users-svc and admin-bff)
```

### User Story 2

```text
T049, T050, T051 and T052 (schemas, errors, constants)
T054 to T062 (one adapter per file)
T084, T085 and T086 (separate Cypress specs)
```

### User Story 3

```text
T088 and T093 to T096 (mock provider, schemas, config, errors)
T098 to T107c (one adapter per file)
T128 to T131 (separate Cypress specs)
```

## Implementation Strategy

### MVP

1. Phases 1 and 2.
2. US1 (Phase 3): validate with a seeded client account.
3. US2 (Phase 4): validate the sign-up and the confirmation. Without it, no new client can exist, so the MVP is US1 + US2.

### Incremental delivery

1. MVP: login, sign-up and confirmation.
2. US3: Google and Facebook, first with the mock provider, then the manual check with the real ones (T143).
3. US4: the appearance checks over every page.
4. Polish.
