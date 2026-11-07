# Completion: 001-admin-login

**Date**: 2026-11-06

| Repository | Branch | Commit | CI run |
|------------|--------|--------|--------|
| club-management-ai | 001-admin-login | bd612ae | https://github.com/ana-navarro/club-management-ai/actions/runs/42323696866 |
| apps/club-management-admin | 001-admin-login | 697e82b | https://github.com/ana-navarro/club-management-admin/actions/runs/42281736219 |
| apps/club-management-client | 001-admin-login | bc13ebc | https://github.com/ana-navarro/club-management-client/actions/runs/42281742746 |
| services/club-management-admin-bff | 001-admin-login | d96d57c | https://github.com/ana-navarro/club-management-admin-bff/actions/runs/42281747992 |
| services/club-management-users-svc | 001-admin-login | 56083a4 | https://github.com/ana-navarro/club-management-users-svc/actions/runs/42281752708 |
| services/club-management-client-bff | 001-admin-login | 0999a33 | https://github.com/ana-navarro/club-management-client-bff/actions/runs/42281757939 |
| services/club-management-scheduling-svc | 001-admin-login | 97a0922 | https://github.com/ana-navarro/club-management-scheduling-svc/actions/runs/42281762585 |
| services/club-management-payment-svc | 001-admin-login | 668cded | https://github.com/ana-navarro/club-management-payment-svc/actions/runs/42281766664 |
| services/club-management-championshp-svc | 001-admin-login | 85f4736 | https://github.com/ana-navarro/club-management-championshp-svc/actions/runs/42281772513 |

## Open

- T152: manual check against Azure DocumentDB and Brevo, which needs the IP allowed in both services.
- The E2E jobs run on ubuntu-22.04 because mongo:8.0 does not start on Linux kernel 6.19 or newer (SERVER-121912).
