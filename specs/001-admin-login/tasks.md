# Tasks: Login do administrador

## Dependencies

- [X] T001 Add react-router, i18next and react-i18next to apps/club-management-admin/package.json
- [X] T002 Add mongoose, @node-rs/argon2, jsonwebtoken, nodemailer, mongodb-memory-server and types to services/club-management-users-svc/package.json
- [X] T003 Move httpx to runtime dependencies in services/club-management-admin-bff/requirements.txt

## servers/club-management-infra

- [X] T004 Add the Mailpit SMTP test server in servers/club-management-infra/docker-compose.yml
- [X] T005 Document the email server and its SMTP_* variables in servers/club-management-infra/README.md

## servers/club-management-server

- [X] T006 Include the infra Compose file, add a local MongoDB and pass database, JWT, SMTP and seed variables to users-svc in servers/club-management-server/docker-compose.yml
- [X] T007 Create indexes and run the seed before starting users-svc in servers/club-management-server/docker-compose.yml
- [X] T008 Pass USERS_SVC_URL to the admin BFF in servers/club-management-server/docker-compose.yml
- [X] T009 Add the new variables, with development-only values, to servers/club-management-server/.env.example

## services/club-management-users-svc

### infra/schemas

- [X] T010 Create the users schema, with clubIds, failedLoginAttempts, lockedUntil, passwordResetRequests, passwordResetWindowStartedAt, knownNetworks and a unique email, in services/club-management-users-svc/src/infra/schemas/users-schema.ts
- [X] T011 [P] Create the clubs schema in services/club-management-users-svc/src/infra/schemas/clubs-schema.ts
- [X] T012 [P] Create the passwordResetTokens schema, with a unique tokenHash and a TTL on expiresAt, in services/club-management-users-svc/src/infra/schemas/password-reset-tokens-schema.ts
- [X] T013 [P] Add the local and Brevo variables and DATABASE_NAME, without real values, in services/club-management-users-svc/.env.example
- [X] T014 Create the ignored local file from the example in services/club-management-users-svc/.env

### domain/models

- [X] T015 [P] Create the User model, with type, clubs and preferences, in services/club-management-users-svc/src/domain/models/user-model.ts
- [X] T016 [P] Create domain errors in services/club-management-users-svc/src/domain/models/auth-errors-model.ts

### domain/ports

- [X] T017 [P] Create input ports for login, refresh, forgot password, reset password, get user and update preferences in services/club-management-users-svc/src/domain/ports/auth-input-ports.ts
- [X] T018 [P] Create output ports for each adapter below in services/club-management-users-svc/src/domain/ports/auth-output-ports.ts

### domain/usecases

- [X] T019 Create login, sending the alert for a new network, with the same error for wrong credentials, other user types, locked accounts and unknown emails, a lock after 3 failures and a new session id, in services/club-management-users-svc/src/domain/usecases/login-user-usecase.ts
- [X] T020 [P] Test login, including different tokens and sessions, the third failure, the lock, its end, the single email and unknown emails, in services/club-management-users-svc/src/domain/usecases/login-user-usecase.test.ts
- [X] T021 Create token renewal, checking the token version, reloading user data, keeping the session and capping expiry at 12 hours, in services/club-management-users-svc/src/domain/usecases/refresh-token-usecase.ts
- [X] T022 [P] Test token renewal, including the 12 hour limit and two sessions at once, in services/club-management-users-svc/src/domain/usecases/refresh-token-usecase.test.ts
- [X] T023 Create the password reset request, limited to 5 per email in a 24 hour window, invalidating the previous link, valid for 2 hours, and with the same response in every case, in services/club-management-users-svc/src/domain/usecases/request-password-reset-usecase.ts
- [X] T024 [P] Test the password reset request, including the sixth request, the end of the 24 hours and the invalidated link, in services/club-management-users-svc/src/domain/usecases/request-password-reset-usecase.test.ts
- [X] T025 Create the password reset, used only when the password changes, with the 8 character rule, raising the token version, and clearing the login lock and request count, in services/club-management-users-svc/src/domain/usecases/reset-password-usecase.ts
- [X] T026 [P] Test the password reset, including expired and reused links, in services/club-management-users-svc/src/domain/usecases/reset-password-usecase.test.ts
- [X] T027 Create the current user lookup in services/club-management-users-svc/src/domain/usecases/get-current-user-usecase.ts
- [X] T028 [P] Test the current user lookup in services/club-management-users-svc/src/domain/usecases/get-current-user-usecase.test.ts
- [X] T029 Create the preferences update in services/club-management-users-svc/src/domain/usecases/update-user-preferences-usecase.ts
- [X] T030 [P] Test the preferences update in services/club-management-users-svc/src/domain/usecases/update-user-preferences-usecase.test.ts

### infra/adapters

- [X] T031 [P] Create find-user-by-email in services/club-management-users-svc/src/infra/adapters/find-user-by-email-adapter.ts
- [X] T032 [P] Create find-user-by-id, with clubs, in services/club-management-users-svc/src/infra/adapters/find-user-by-id-adapter.ts
- [X] T033 [P] Create update-user-preferences in services/club-management-users-svc/src/infra/adapters/update-user-preferences-adapter.ts
- [X] T034 [P] Create update-user-password, raising the token version and clearing the login lock and request count, in services/club-management-users-svc/src/infra/adapters/update-user-password-adapter.ts
- [X] T035 [P] Create create-password-reset-token in services/club-management-users-svc/src/infra/adapters/create-password-reset-token-adapter.ts
- [X] T036 [P] Create find-password-reset-token in services/club-management-users-svc/src/infra/adapters/find-password-reset-token-adapter.ts
- [X] T037 [P] Create mark-password-reset-token-used in services/club-management-users-svc/src/infra/adapters/mark-password-reset-token-used-adapter.ts
- [X] T038 [P] Create hash-password in services/club-management-users-svc/src/infra/adapters/hash-password-adapter.ts
- [X] T039 [P] Create verify-password in services/club-management-users-svc/src/infra/adapters/verify-password-adapter.ts
- [X] T040 [P] Create sign-token, with the given expiry, a random jti, the session and the user claims, in services/club-management-users-svc/src/infra/adapters/sign-token-adapter.ts
- [X] T041 [P] Create verify-token in services/club-management-users-svc/src/infra/adapters/verify-token-adapter.ts
- [X] T042 [P] Create send-password-reset-email, in Portuguese and English, in services/club-management-users-svc/src/infra/adapters/send-password-reset-email-adapter.ts
- [X] T043 Test the database adapters against mongodb-memory-server in services/club-management-users-svc/src/infra/adapters/database-adapters.test.ts
- [X] T044 [P] Test the password adapters in services/club-management-users-svc/src/infra/adapters/password-adapters.test.ts
- [X] T045 [P] Test the token adapters, including the expiry, the claims, the absence of sensitive data and different tokens in the same second, in services/club-management-users-svc/src/infra/adapters/token-adapters.test.ts
- [X] T046 [P] Test the email adapter and its two languages in services/club-management-users-svc/src/infra/adapters/send-password-reset-email-adapter.test.ts

### application/dto

- [X] T047 Create the Zod schemas for every request and response in services/club-management-users-svc/src/application/dto/auth-dto.ts

### application/middlewares

- [X] T048 Create the token check in services/club-management-users-svc/src/application/middlewares/require-auth-middleware.ts
- [X] T049 [P] Test the token check in services/club-management-users-svc/src/application/middlewares/require-auth-middleware.test.ts
- [X] T050 Map domain and validation errors to status codes in services/club-management-users-svc/src/application/middlewares/handle-error-middleware.ts
- [X] T051 [P] Test the error mapping in services/club-management-users-svc/src/application/middlewares/handle-error-middleware.test.ts

### application/controllers

- [X] T052 Create controllers for login, refresh, forgot password and reset password in services/club-management-users-svc/src/application/controllers/auth-controller.ts
- [X] T053 Create controllers for the current user and preferences in services/club-management-users-svc/src/application/controllers/user-controller.ts

### application/routes

- [X] T054 Create the /auth routes in services/club-management-users-svc/src/application/routes/auth-route.ts
- [X] T055 Create the /users/me routes in services/club-management-users-svc/src/application/routes/user-route.ts
- [X] T056 Test the /auth routes with Supertest in services/club-management-users-svc/src/application/routes/auth-route.test.ts
- [X] T057 Test the /users/me routes with Supertest in services/club-management-users-svc/src/application/routes/user-route.test.ts

### config

- [X] T058 Read and require DATABASE_URL, DATABASE_NAME, JWT_SECRET, SMTP_*, SMTP_FROM, APP_URL and TLS_* in services/club-management-users-svc/src/config/load-env-config.ts
- [X] T059 Test the required variables in services/club-management-users-svc/src/config/load-env-config.test.ts
- [X] T060 Create the Mongoose connection in services/club-management-users-svc/src/config/create-database-config.ts
- [X] T061 Wire adapters, usecases and routes in services/club-management-users-svc/src/config/create-app-config.ts
- [X] T062 Create the index and seed script, which needs SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, in services/club-management-users-svc/src/config/run-seed-config.ts
- [X] T063 Test the seed, including running twice and running without variables, in services/club-management-users-svc/src/config/run-seed-config.test.ts

## services/club-management-admin-bff

### domain/ports

- [X] T064 [P] Create the input and output ports in services/club-management-admin-bff/src/domain/ports/auth_ports.py

### domain/usecases

- [X] T065 Create the usecases, orchestrating login with user type ADMIN and saving session preferences when the user has none, in services/club-management-admin-bff/src/domain/usecases/auth_usecases.py
- [X] T066 [P] Test the orchestration, including both preference cases, in services/club-management-admin-bff/tests/test_auth_usecases.py

### infra/adapters

- [X] T067 Create one httpx adapter per action for the users service in services/club-management-admin-bff/src/infra/adapters/users_svc_adapters.py
- [X] T068 Test the adapters, including keeping the status code from the service, in services/club-management-admin-bff/tests/test_users_svc_adapters.py

### application

- [X] T069 [P] Create the Pydantic schemas, which keep only the contract fields, in services/club-management-admin-bff/src/application/dto/auth_dto.py
- [X] T070 Create the controllers in services/club-management-admin-bff/src/application/controllers/auth_controller.py
- [X] T071 Create the /auth and /users/me routes in services/club-management-admin-bff/src/application/routes/auth_route.py
- [X] T072 Test the routes and that no field outside the contract reaches the response in services/club-management-admin-bff/tests/test_auth_route.py

### config

- [X] T073 Read USERS_SVC_URL and wire everything in services/club-management-admin-bff/src/config/create_app_config.py

## apps/club-management-admin

### src/shared/theme

- [X] T074 Create light and dark themes from the palette in apps/club-management-admin/src/shared/theme/theme.ts
- [X] T075 Create ColorModeProvider, saving to sessionStorage and following the system by default, in apps/club-management-admin/src/shared/theme/ColorModeProvider.tsx
- [X] T076 [P] Test both themes' palette values in apps/club-management-admin/src/shared/theme/theme.test.ts
- [X] T077 [P] Test choice, sessionStorage and system default in apps/club-management-admin/src/shared/theme/ColorModeProvider.test.tsx

### src/shared/i18n

- [X] T078 [P] Add Portuguese texts in apps/club-management-admin/src/shared/i18n/pt-BR.json
- [X] T079 [P] Add English texts in apps/club-management-admin/src/shared/i18n/en.json
- [X] T080 Configure i18next, saving to sessionStorage and following the browser by default, in apps/club-management-admin/src/shared/i18n/i18n.ts
- [X] T081 Test detection, sessionStorage and matching keys in both files in apps/club-management-admin/src/shared/i18n/i18n.test.ts

### src/shared/services

- [X] T082 Create the single access point for the token and expiry in apps/club-management-admin/src/shared/services/auth-token.ts
- [X] T083 [P] Test saving, reading and clearing in apps/club-management-admin/src/shared/services/auth-token.test.ts
- [X] T084 Send the token, add postJson and patchJson, and clear the token on 401 in apps/club-management-admin/src/shared/services/http-client.ts
- [X] T085 Test the token header, the new helpers and 401 handling in apps/club-management-admin/src/shared/services/http-client.test.ts
- [X] T086 Create useCurrentUser with useSWR in apps/club-management-admin/src/shared/services/useCurrentUser.ts
- [X] T087 [P] Test useCurrentUser in apps/club-management-admin/src/shared/services/useCurrentUser.test.tsx
- [X] T088 Create useUpdatePreferences with useSWRMutation in apps/club-management-admin/src/shared/services/useUpdatePreferences.ts
- [X] T089 [P] Test useUpdatePreferences in apps/club-management-admin/src/shared/services/useUpdatePreferences.test.tsx

### src/shared/hooks

- [X] T090 Create useSessionRenewal, with activity tracking, renewal after renewAt and the expiry timer, in apps/club-management-admin/src/shared/hooks/useSessionRenewal.ts
- [X] T091 Test renewal with activity, no renewal when idle, a single call at a time and expiry, using fake timers, in apps/club-management-admin/src/shared/hooks/useSessionRenewal.test.tsx
- [X] T092 Create usePreferencesSync, applying the preferences returned at login and saving changes while authenticated, in apps/club-management-admin/src/shared/hooks/usePreferencesSync.ts
- [X] T093 Test applying and saving preferences in apps/club-management-admin/src/shared/hooks/usePreferencesSync.test.tsx

### src/shared/components (with .stories.tsx)

- [X] T094 [P] Create LanguageSwitch in apps/club-management-admin/src/shared/components/LanguageSwitch/LanguageSwitch.tsx
- [X] T095 [P] Add LanguageSwitch stories in apps/club-management-admin/src/shared/components/LanguageSwitch/LanguageSwitch.stories.tsx
- [X] T096 [P] Test LanguageSwitch in apps/club-management-admin/src/shared/components/LanguageSwitch/LanguageSwitch.test.tsx
- [X] T097 [P] Create ThemeSwitch in apps/club-management-admin/src/shared/components/ThemeSwitch/ThemeSwitch.tsx
- [X] T098 [P] Add ThemeSwitch stories in apps/club-management-admin/src/shared/components/ThemeSwitch/ThemeSwitch.stories.tsx
- [X] T099 [P] Test ThemeSwitch in apps/club-management-admin/src/shared/components/ThemeSwitch/ThemeSwitch.test.tsx
- [X] T100 Create PublicLayout, with the switches and a responsive card, in apps/club-management-admin/src/shared/components/PublicLayout/PublicLayout.tsx
- [X] T101 Add PublicLayout stories, including MobileViewport, in apps/club-management-admin/src/shared/components/PublicLayout/PublicLayout.stories.tsx
- [X] T102 Test PublicLayout in apps/club-management-admin/src/shared/components/PublicLayout/PublicLayout.test.tsx
- [X] T103 Create RequireAuth, running session renewal, and PublicOnly in apps/club-management-admin/src/shared/components/RouteGuards/RouteGuards.tsx
- [X] T104 Add RouteGuards stories in apps/club-management-admin/src/shared/components/RouteGuards/RouteGuards.stories.tsx
- [X] T105 Test both guards with and without a token in apps/club-management-admin/src/shared/components/RouteGuards/RouteGuards.test.tsx

### src/shared/utils

- [X] T106 [P] Create the form validation with Zod in apps/club-management-admin/src/shared/utils/validate-form.ts
- [X] T107 [P] Test the form validation in apps/club-management-admin/src/shared/utils/validate-form.test.ts

### src/pages/Login

- [X] T108 Create useLogin with useSWRMutation, sending the session preferences, in apps/club-management-admin/src/pages/Login/services/useLogin.ts
- [X] T109 Test useLogin success and failure in apps/club-management-admin/src/pages/Login/services/useLogin.test.tsx
- [X] T110 Create LoginForm, with no sign-up link, in apps/club-management-admin/src/pages/Login/components/LoginForm.tsx
- [X] T111 Test validation, loading, invalid credentials and the forgot password link in apps/club-management-admin/src/pages/Login/components/LoginForm.test.tsx
- [X] T112 Create the Login page, with the session expired notice, in apps/club-management-admin/src/pages/Login/index.tsx
- [X] T113 Test the redirect, the notice and the absence of a sign-up link in apps/club-management-admin/src/pages/Login/index.test.tsx

### src/pages/ForgotPassword

- [X] T114 Create useForgotPassword with useSWRMutation in apps/club-management-admin/src/pages/ForgotPassword/services/useForgotPassword.ts
- [X] T115 [P] Test useForgotPassword in apps/club-management-admin/src/pages/ForgotPassword/services/useForgotPassword.test.tsx
- [X] T116 Create useResetPassword with useSWRMutation in apps/club-management-admin/src/pages/ForgotPassword/services/useResetPassword.ts
- [X] T117 [P] Test useResetPassword in apps/club-management-admin/src/pages/ForgotPassword/services/useResetPassword.test.tsx
- [X] T118 Create ForgotPasswordForm in apps/club-management-admin/src/pages/ForgotPassword/components/ForgotPasswordForm.tsx
- [X] T119 [P] Test validation, the neutral confirmation and errors in apps/club-management-admin/src/pages/ForgotPassword/components/ForgotPasswordForm.test.tsx
- [X] T120 Create ResetPasswordForm, showing the errors returned by the backend, in apps/club-management-admin/src/pages/ForgotPassword/components/ResetPasswordForm.tsx
- [X] T121 [P] Test confirmation, backend errors, success and invalid links in apps/club-management-admin/src/pages/ForgotPassword/components/ResetPasswordForm.test.tsx
- [X] T122 Create the page, choosing the form by the token in the URL, in apps/club-management-admin/src/pages/ForgotPassword/index.tsx
- [X] T123 Test both modes in apps/club-management-admin/src/pages/ForgotPassword/index.test.tsx

### src/pages/Home

- [X] T124 Translate the title and add the switches in apps/club-management-admin/src/pages/Home/index.tsx
- [X] T125 Update the Home test in apps/club-management-admin/src/pages/Home/index.test.tsx

### App and routes

- [X] T126 Add the routes and send unknown paths to the guarded home page in apps/club-management-admin/src/App.tsx
- [X] T127 Test public routes, protected routes and redirects in apps/club-management-admin/src/App.test.tsx
- [X] T128 Load i18n in apps/club-management-admin/src/main.tsx
- [X] T129 Load i18n and clear sessionStorage between tests in apps/club-management-admin/jest.setup.ts

### Storybook

- [X] T130 Add theme and language controls in apps/club-management-admin/.storybook/preview.tsx
- [X] T131 Run the accessibility check in both themes in apps/club-management-admin/.storybook/test-runner.ts

## .github/workflows

- [X] T132 Pass the seed credentials and start the new containers for E2E in .github/workflows/ci.yml
- [X] T133 Validate the Mailpit Compose file in .github/workflows/infra.yml

## e2e/club-management-admin

### Cypress flows (mobile viewport)

- [X] T134 Replace the Home test, since / now requires a token, in e2e/club-management-admin/cypress/e2e/home.cy.ts
- [X] T135 Test the redirect, real login with the seeded admin, two sessions at once, invalid credentials and the absence of a sign-up link in e2e/club-management-admin/cypress/e2e/login.cy.ts
- [X] T136 Test the renewal with activity, the expiry when idle and the 12 hour limit, using a simulated clock, in e2e/club-management-admin/cypress/e2e/session.cy.ts
- [X] T137 Test the whole password recovery, reading the link from the Mailpit API, in e2e/club-management-admin/cypress/e2e/forgot-password.cy.ts
- [X] T138 Test the switches, reload, a new session and the user's saved choices in e2e/club-management-admin/cypress/e2e/preferences.cy.ts
- [X] T139 Test for no horizontal scroll at 390 px and 1280 px in e2e/club-management-admin/cypress/e2e/responsive.cy.ts

## Environment files

- [X] T140 [P] Create .env.example, without real values, and the ignored local .env in apps/club-management-admin/.env.example
- [X] T141 [P] Create .env.example, without real values, and the ignored local .env in apps/club-management-client/.env.example
- [X] T142 [P] Create .env.example, without real values, and the ignored local .env in services/club-management-admin-bff/.env.example
- [X] T143 [P] Create .env.example, without real values, and the ignored local .env in services/club-management-client-bff/.env.example
- [X] T144 [P] Create .env.example, without real values, and the ignored local .env in services/club-management-scheduling-svc/.env.example
- [X] T145 [P] Create .env.example, without real values, and the ignored local .env in services/club-management-payment-svc/.env.example
- [X] T146 [P] Create .env.example, without real values, and the ignored local .env in services/club-management-championshp-svc/.env.example
- [X] T147 [P] Create .env.example, without real values, and the ignored local .env in e2e/club-management-admin/.env.example
- [X] T148 [P] Create .env.example, without real values, and the ignored local .env in e2e/club-management-client/.env.example
- [X] T149 [P] Create .env.example, without real values, and the ignored local .env in servers/club-management-infra/.env.example
- [X] T150 [P] Create .env.example, without real values, and the ignored local .env in servers/club-management-server/.env.example
- [X] T151 Use each project's optional .env in servers/club-management-server/docker-compose.yml
- [ ] T152 Check manually that indexes, login and password reset work against Azure DocumentDB and that Brevo delivers the email, and record the result in specs/001-admin-login/azure-brevo-check.md — Omitted: needs the IP allowed in Azure and Brevo

## Login attempts

- [X] T153 [P] Create record-failed-login, atomically counting failures and setting the lock, in services/club-management-users-svc/src/infra/adapters/record-failed-login-adapter.ts
- [X] T154 [P] Create clear-failed-logins in services/club-management-users-svc/src/infra/adapters/clear-failed-logins-adapter.ts
- [X] T155 Test both adapters, including simultaneous failures, against mongodb-memory-server in services/club-management-users-svc/src/infra/adapters/failed-login-adapters.test.ts
- [X] T156 [P] Create send-login-attempts-email, in Portuguese and English, with the link to change the password, in services/club-management-users-svc/src/infra/adapters/send-login-attempts-email-adapter.ts
- [X] T157 [P] Test the email and its two languages in services/club-management-users-svc/src/infra/adapters/send-login-attempts-email-adapter.test.ts
- [X] T158 Test the third failure, the email from Mailpit, the lock and unlocking through the link in e2e/club-management-admin/cypress/e2e/login-attempts.cy.ts

## Login from a new location

- [X] T159 Set X-Real-IP from the client address in servers/club-management-server/nginx/nginx.conf
- [X] T160 [P] Create add-known-network, keeping up to 20 hashed prefixes, in services/club-management-users-svc/src/infra/adapters/add-known-network-adapter.ts
- [X] T161 Test the prefixes for IPv4 and IPv6, the 20 item limit and that full IPs are never saved in services/club-management-users-svc/src/infra/adapters/add-known-network-adapter.test.ts
- [X] T162 [P] Create send-new-location-email, in Portuguese and English, in services/club-management-users-svc/src/infra/adapters/send-new-location-email-adapter.ts
- [X] T163 [P] Test the email and its two languages in services/club-management-users-svc/src/infra/adapters/send-new-location-email-adapter.test.ts
- [X] T164 Forward the client address and browser to the users service on login in services/club-management-admin-bff/src/infra/adapters/users_svc_adapters.py
- [X] T165 Test the forwarded values in services/club-management-admin-bff/tests/test_users_svc_adapters.py
- [X] T166 [P] Create increment-password-reset-requests, counting atomically and restarting after 24 hours, in services/club-management-users-svc/src/infra/adapters/increment-password-reset-requests-adapter.ts
- [X] T167 Test simultaneous requests and the 24 hour restart against mongodb-memory-server in services/club-management-users-svc/src/infra/adapters/increment-password-reset-requests-adapter.test.ts
- [X] T168 [P] Create invalidate-password-reset-tokens in services/club-management-users-svc/src/infra/adapters/invalidate-password-reset-tokens-adapter.ts
- [X] T169 Test the sixth request and restarting after a password change, reading Mailpit, in e2e/club-management-admin/cypress/e2e/forgot-password-limit.cy.ts

## Internal communication (mTLS)

- [X] T170 Create the script that generates the private authority and one certificate per caller and service, only if missing, in servers/club-management-server/scripts/generate-certs.sh
- [X] T171 Run the script in a one-shot container, saving to a Docker volume mounted read-only where needed, in servers/club-management-server/docker-compose.yml
- [X] T172 Call both BFFs over HTTPS with a client certificate, verifying the server certificate, in servers/club-management-server/nginx/nginx.conf
- [X] T173 Start both BFFs with TLS, requiring a client certificate, in servers/club-management-server/docker-compose.yml
- [X] T174 Create the HTTPS server, requiring a client certificate, in services/club-management-users-svc/src/config/create-https-server-config.ts
- [X] T175 Test that calls without a certificate, with one from another authority or over plain HTTP are refused, in services/club-management-users-svc/src/config/create-https-server-config.test.ts
- [X] T176 Start the service with the HTTPS server in services/club-management-users-svc/src/main.ts
- [X] T177 Call the users service with the client certificate and verify the server certificate in services/club-management-admin-bff/src/infra/adapters/users_svc_adapters.py
- [X] T178 Read TLS_* and create the HTTP client in services/club-management-admin-bff/src/config/create_http_client_config.py
- [X] T179 Test the client configuration in services/club-management-admin-bff/tests/test_create_http_client_config.py
- [X] T180 Generate the certificates before validating NGINX in .github/workflows/server.yml
- [X] T181 Test from inside the Docker network that the users service and the BFFs refuse calls without a certificate in e2e/club-management-admin/cypress/e2e/internal-tls.cy.ts

## Strict typing

- [X] T182 Remove as, !, any, unknown and never from services/club-management-users-svc/src
- [X] T183 Validate API responses, stored sessions and navigation state with Zod in apps/club-management-admin/src/shared/services/http-client.ts
- [X] T184 Remove as, !, any, unknown and never from apps/club-management-client/src
- [X] T185 Remove as and ! from e2e/club-management-admin/cypress
- [X] T186 Fail lint on these uses in the eslint.config.js of every TypeScript project

## Form validation

- [X] T187 Validate the login form with a Zod schema before sending in apps/club-management-admin/src/pages/Login/services/login-form-schema.ts
- [X] T188 Validate the forgot password form with a Zod schema before sending in apps/club-management-admin/src/pages/ForgotPassword/services/forgot-password-form-schema.ts
- [X] T189 Validate the new password form with a Zod schema before sending in apps/club-management-admin/src/pages/ForgotPassword/services/reset-password-form-schema.ts

## Pipeline

- [X] T190 Wait for the stack with a real login, limit the wait and show the logs on cancellation in .github/workflows/ci.yml
- [X] T191 Run the E2E jobs on ubuntu-22.04, whose kernel still runs mongo:8.0, in .github/workflows/ci.yml
