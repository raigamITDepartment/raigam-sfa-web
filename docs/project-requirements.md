# Raigam SFA Web – Product Requirements Document (PRD)

**Document Version:** 1.0  
**Last Updated:** 12 February 2026  
**Owner:** Raigam IT Department – Web Applications Team  
**Application:** Raigam Sales Force Automation (SFA) Web App

---

## 1. Purpose & Vision
- Provide a single web-based workspace for Raigam field, sales, agency, HR, and admin teams to plan, execute, and audit sales and distribution operations.
- Deliver real-time visibility into inventory, invoices, outlets, territories, and workforce activities so leaders can act within the same business day.
- Reduce manual reconciliation by digitizing approvals, geography mappings, invoice reversals, and compliance workflows.

### Success Metrics
- 95% of invoices processed digitally without spreadsheet intervention by Q4 2026.
- < 3 minutes average time to answer “current stock vs target” for any territory.
- 100% field staff GPS/attendance data captured daily; < 5% location anomalies.
- < 1% unauthorized access attempts thanks to enforced role/permission guardrails.

---

## 2. In-Scope vs Out-of-Scope
| Scope | Description |
| --- | --- |
| ✅ In | React/Vite web frontend interacting with Spring Boot APIs, Firebase notifications, JWT auth, and Google Maps. |
| ✅ In | Modules already scaffolded in the codebase: Dashboards, Master Settings, Sales (Details & Operations), Outlet, Reports, HR, Admin, Agency, and global layout/search. |
| ✅ In | Role-based access, territory/demarcation maintenance, Excel/PDF exports, invoice reverse workflow notifications. |
| ✅ In | Environment-specific configuration (.env, Firebase, Google Maps key), responsive UI, accessibility baseline (WCAG AA). |
| 🚫 Out | Native mobile apps (covered by SFA mobile), backend feature work (owned by API team), data warehouse/BI beyond exported reports, offline-first mode, and on-prem deployments.

---

## 3. Stakeholders & Personas
| Persona | Responsibilities | Key Needs |
| --- | --- | --- |
| System Administrator | Manages users, permissions, agency operations, configuration. | Full module access, audit trails, tooling to unblock others quickly. |
| Top/Senior/Manager Sales Leadership | Plan targets, review KPIs, approve working days, monitor coverage. | Dashboards, analytics, geography mapping, outlet and stock insights. |
| Executive Sales / Field Agents | Execute visits, capture orders, manage returns. | Outlet lists, stock & item visibility, invoice workflows, GPS capture. |
| Agency Operations | Manage agency invoices, stock, loading lists, market returns. | Guided invoice entry, reverse approvals, notifications. |
| HR / Operations | Track attendance, GPS compliance, manual bill quotas. | HR module screens, exports, incident alerts. |
| Finance / Auditors | Need evidence for invoices, route plans, price overrides. | Reports, Excel/PDF exports, immutable audit logs. |

---

## 4. Assumptions & Constraints
- Backend APIs (Spring Boot) expose `/api/v1/*` endpoints secured with JWT + refresh tokens and enforce the same permission set as the frontend (`src/lib/authz.ts`).
- MySQL is the system of record; frontend never stores PII beyond encrypted tokens/local cached user payload.
- Firebase project (web) exists for notifications and optional auth bridging; Google Maps API key has Maps JavaScript + Places enabled.
- Users authenticate with corporate credentials; optional Clerk integration remains disabled until SSO go-live.
- Target browsers: latest Chrome, Edge, Safari, Firefox on desktop; tablet form factor must remain responsive but not primary.
- All third-party SaaS (Firebase, Google) must reside in jurisdictions approved by Raigam InfoSec.

---

## 5. User Roles & Access Control
Source of truth: `src/lib/authz.ts`.

### Business Roles (RoleId)
1. System Admin (1)
2. Top Manager (2)
3. Senior Manager – Sales (3) / Company (4)
4. Manager – Sales (5) / Company (6)
5. Executive – Sales (7) / Company (8)
6. Operation Sales (11) / Operation Company (12)

### Sub-Roles (SubRoleId – highlights)
- Admin, Managing Director, GM, Channel/Sub-channel Heads
- Region/Area Sales Managers, Representatives/Agents
- TNC, CCU, Finance, Brand, HR, RMS, Internal Audits, etc.

### Permission Model
- Every route path maps to explicit permission keys (e.g., `dashboard.overview`, `sales.operations.itemMaster`).
- Guards enforced at router `beforeLoad` and again within UI helpers like `ensureRoleAccess` and `can()`.
- Agent-level and area-level user types receive custom restrictions (e.g., agents cannot access manual invoice creation, area users cannot reach invoice summary screens).
- Requirement: maintain a human-readable access matrix as part of release documentation; updates require Product + Security sign-off.

---

## 6. Functional Requirements

### 6.1 Authentication & Session Management
- Support credential login via `/sign-in` using API `auth/login` plus Remember Me toggle; store JWT access + refresh tokens via `tokenService`.
- Refresh tokens auto-renew until explicitly revoked; if refresh fails, redirect to sign-in and clear local/session storage.
- Provide Firebase custom token fallback. If absent, derive email login using configured domain and sign into Firebase for notifications.
- Honor read-only flags (`isReadOnlyUserTypeId`) by blocking write HTTP verbs client-side and surfacing 403 error copy.
- Idle logout: refresh tokens expire server-side; UI must display session timeout warning at least 2 minutes before enforced logout.

### 6.2 Global Layout, Navigation, & Preferences
- Authenticated layout (`AuthenticatedLayout`) supplies sidebar, header controls (fullscreen, theme switch, config drawer, notification bell, profile dropdown).
- Persist sidebar open/closed state inside `sidebar_state` cookie; default expanded on first login.
- Provide breadcrumbs on every module page (see `PageHeader`).
- Search provider + Layout provider power global cmdk search (planned) and variant toggles; design must support container queries for responsive cards.

### 6.3 Dashboards
- **Overview:** Serve role-aware widgets via `OverviewByUserGroup`, switching between System Admin, Top Mgmt, Senior/Manager Sales, Executive-level overviews.
- **Home Report:** Provide summarised field KPIs (route completion, invoice counts) with filters for territory/date.
- **Heart Count:** Visualize outlet health/“heart beat” statuses; highlight overdue visits.
- All dashboards must refresh via TanStack Query with cache invalidation ≤5 minutes and allow CSV export of underlying tables.

### 6.4 Master Settings
- **Demarcation:** CRUD for multi-level geography (country > region > area > territory > route). Bulk import/export via Excel.
- **Distributor Mapping:** Map distributors to territories/outlets; show conflicts and highlight unmapped outlets.
- **Final Geography Mapping:** Consolidate demarcation + distributor assignments; enforce validation before publishing changes to downstream mobile apps.

### 6.5 Sales Module
#### 6.5.1 Sales Details
- **View All Items:** Paginated table of catalogue items (code, pack, category, price, availability). Provide download as XLSX using `xlsx` dependency.
- **Stock:** Show stock by warehouse/territory; compare against min/max thresholds with alerts.
- **Market Return:** Capture return reason, quantity, batch, credit note details, supporting documents.
- **View Invoices (optional toggle):** Display invoice list with filters by agent/outlet; enable invoice reverse request flow.

#### 6.5.2 Sales Operations
- **Manage Category:** Tabbed UI (category type, main, sub, sub-sub, flavour) with validations to prevent duplicates.
- **Item Master & Item Add:** Maintain full product master; provide inline form validation using React Hook Form + Zod.
- **Working Day:** Calendar (react-big-calendar) for route plans; support drag-drop adjustments, day templates, and holiday rules.
- **Target:** Capture numeric targets by SKU/territory/time period; compute achievement % and sync with dashboards.
- **Free Issue:** Configure promotional bundles, eligibility rules, validity windows, and channel applicability.

### 6.6 Outlet Module
- **Outlets:** Advanced table with filters (region, status, last visit). Provide map popover, show route/territory metadata, allow export.
- Future scope: route planning view and outlet photo gallery (placeholder `OutletModuleRoutes`).

### 6.7 Reports Module
- **Invoice Reports:** Territory-wise & Area-wise invoice summary; include totals, filters, download as Excel/PDF, and variance vs target.
- **Item Reports:** Item summary plus category, sub-category, sub-two category rollups, trending charts via Recharts.
- **Outlet Reports:** Not visited outlet list & sale summary; show last visit date, assigned rep, actions taken.
- **Other Reports (commented but expected soon):** Achievement category-wise, area-wise sales, territory-wise sales/items. Keep feature flags ready.
- All reports must support date pickers (react-day-picker), route/territory filters, column chooser, and offline export.

### 6.8 HR Module
- **GPS Monitoring:** Load Google Maps via `@react-google-maps/api`; visualize agent tracks, markers (check-in/out, invoice stops), playback controls (speed slider, pause/play), and battery indicators. Filters: date, agent, area, route, device status.
- **Time Attendance:** Show check-in/out records, compare with planned working day, provide exceptions export for HR.
- Provide alerts when GPS data missing >30 minutes during active route.

### 6.9 Admin Module
- **User Module:** Add/modify user with demarcation assignment, role/sub-role, activation toggles. Manage permissions matrix visually. Provide Excel export (see `user-list-export`).
- **Operations → Manual Bill Quota:** Configure manual billing allowances per territory/agent with start/end dates and audit log.
- Require dual approval (creator + approver) for permission or quota changes.

### 6.10 Agency Module
- **Invoice:** View invoice list, manual invoice entry, invoices summary; enforce validation, duplicates prevention, tax calculations, and ability to trigger reverse workflows (request → approve → complete) with Firebase notifications.
- **Loading List:** Display loading instructions, assign vehicles, print PDF using `pdf-lib` template.
- **Market Return:** Dedicated interface for agency-level returns, referencing invoices/outlets.
- **Stock:** View, add, request order; ensure request order triggers manual approval and optional email to warehouse.

### 6.11 Notifications & Communications
- Use Firebase Firestore `notifications` collection. Support event types: `INVOICE_REVERSE_REQUEST`, `INVOICE_REVERSE_APPROVED`, `INVOICE_REVERSE_COMPLETED` with sender/recipient metadata.
- UI bell shows unread count, quick actions (mark read, open invoice). Provide fallback if Firebase auth missing.

### 6.12 Error Handling & Maintenance
- Error routes exist (`/errors/unauthorized`, `/errors/not-found`, etc.). Requirements: friendly copy, CTA back to dashboard, telemetry event.
- Maintenance mode page should surface when backend returns 503 + `X-Maintenance-Mode` header.

### 6.13 Accessibility & UX
- Meet WCAG 2.1 AA for keyboard navigation, focus traps (Radix components), contrast, ARIA labels.
- Support theme switching (light/dark) and persist preference per user.
- Provide responsive layout for ≥1024px width and degrade gracefully to 768px.

---

## 7. Data & Integration Requirements
### 7.1 API Contracts
- Base URL defaults to `https://dev-sfa-api-gateway.purplesand-bdf733b9.southeastasia.azurecontainerapps.io`; override via `VITE_API_BASE_URL` per environment.
- All requests use Axios instance with interceptors for token refresh, read-only enforcement, and logging in development.
- Critical endpoints (examples):
  - `/api/v1/auth/login`, `/api/v1/auth/refresh`
  - `/api/v1/reports/*` for dashboards/reports
  - `/api/v1/user-demarcation/*` for geography, GPS, HR data
  - `/api/v1/agencies/*` for invoice/stock operations.
- Mandatory headers: `Authorization: Bearer <token>`, `Content-Type: application/json`; large exports may use streaming.

### 7.2 Environment Variables
| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend REST gateway base. |
| `VITE_AUTH_TOKEN_KEY` | Local storage key for JWT caching. |
| `VITE_APP_ENV` | Displayed in UI config drawer for environment awareness. |
| `VITE_FIREBASE_*` (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID, measurement ID) | Initialize Firebase app. |
| `VITE_FIREBASE_LOGIN_EMAIL`, `VITE_FIREBASE_LOGIN_PASSWORD`, `VITE_FIREBASE_LOGIN_DOMAIN` | Optional fallback credentials when no custom token supplied. |
| `VITE_GOOGLE_MAPS_API_KEY` | Required for GPS Monitoring map loader. |

### 7.3 Data Handling
- Cache authenticated user payload (`auth_user`) in localStorage; sensitive data (tokens) stored in HTTP-only cookies where possible.
- Excel exports rely on `xlsx`; ensure server supports large dataset pagination to avoid client OOM.
- PDF outputs rely on `pdf-lib`; templates stored locally under `src/assets/templates` (to be added).
- GPS data stored/queried through user demarcation API; store up to 20 waypoints per replay to avoid Google Maps quota spikes.

### 7.4 External Services
- Firebase Firestore (notifications), Firebase Auth (token bridging).
- Google Maps JavaScript API for GPS and outlet mapping overlays.
- Optional Clerk workspace (dependency already installed) for future SSO.

---

## 8. Non-Functional Requirements
- **Security:** Enforce HTTPS, OWASP Top 10 controls, CSRF-safe patterns (token auth), rate-limit sensitive endpoints, mask PII in logs.
- **Performance:** Initial dashboard load < 2.5s on 3G, page-to-page navigation < 1.2s (thanks to client routing). Largest contentful paint < 2.5s, interaction readiness < 200ms for table filters.
- **Scalability:** Support 2,000 concurrent users, 50k outlets, 500k invoices without client freezing (virtualized tables when dataset > 1k rows).
- **Reliability:** 99.5% monthly availability; graceful degradation if Firebase/Maps unavailable (show banner, fallback UI).
- **Maintainability:** Type-safe APIs, Redux slices for auth/invoices, TanStack Query for server cache, shared UI system (shadcn). Lint + format enforced via `npm run lint` and `npm run format`.
- **Observability:** Log API errors with correlation IDs, push front-end telemetry to centralized logging (Azure App Insights or similar). Capture GPS replay errors separately.
- **Compliance:** Retain audit logs for user management and invoice reversals for ≥ 3 years; follow Raigam data retention & GDPR-equivalent privacy policies.

---

## 9. Reporting & Analytics Expectations
- Every report screen exposes: filters (date range, region, territory, channel, rep), aggregated cards, detail tables, and export actions (XLSX + PDF).
- Provide scheduled export hooks via backend cron (future) but allow manual download today.
- Dashboards should surface comparative metrics: target vs achievement, coverage %, aging, top/bottom performers.
- Heart Count dashboard must highlight outlets with missing visits >14 days.

---

## 10. Deployment & DevOps
- Tooling: Vite build (`npm run build`), TypeScript project references (`tsconfig.app.json`, `tsconfig.node.json`).
- CI pipeline steps: install (npm ci), lint, test (when added), build, upload artifacts. Provide preview via `npm run preview` on staging.
- Hosting: Netlify / Azure Static Web Apps (supported config files already present). Serve behind Raigam SSO gateway when ready.
- Cache busting: include git hash in build metadata and surface inside `ConfigDrawer` for support teams.
- Feature flags: prefer `import.meta.env` toggles or dedicated config service for modules not ready for GA (e.g., disabled reports).

---

## 11. Testing & QA
- **Unit Tests:** Components with complex logic (GPS monitoring, category tabs, notification services) need Jest/Vitest coverage ≥70%.
- **Integration Tests:** Simulate auth + role guard flows, invoice reverse workflow, manual bill quota update.
- **E2E Tests:** Cypress/Playwright covering login, dashboard load, creating item, approving invoice reverse, exporting reports.
- **Performance Tests:** Lighthouse budgets integrated into CI; fail build if budgets exceeded.
- **Security Tests:** Regular dependency audit (`npm audit`), penetration testing on auth endpoints, verify token refresh logic.

---

## 12. Acceptance Criteria (Snapshot)
- **Dashboards:** Real data rendered for each role, filters persist via URL params, export buttons functional.
- **Master Settings:** Users with permission can add/edit/delete demarcations; duplicate prevention and error messaging verified.
- **Sales Operations:** Item master update syncs to backend and is visible in View All Items within 1 minute.
- **Outlet Module:** Search returns results in <500ms for up to 10k outlets; export matches filter selection.
- **Reports:** Date filter affects charts & tables consistently; XLSX exports include company header + timestamp.
- **HR GPS:** Map playback draws up to 20 waypoints with speed control; offline/out-of-coverage segments flagged.
- **Admin:** Creating a new user triggers Firebase auth linking (if configured) and logs audit event.
- **Agency:** Invoice reverse workflow sends three notifications (request, approval, completion) and updates status timeline.

---

## 13. Open Questions & Future Enhancements
1. Confirm rollout plan for Clerk SSO vs existing auth; update login UI accordingly.
2. Define SLA for GPS data ingestion latency and whether to store raw tracks for >30 days.
3. Determine if outlet routes module should integrate with route optimization service.
4. Clarify compliance requirements for storing invoice PDFs within the frontend caches.
5. Decide on localization roadmap (Sinhala/Tamil translations) and currency formatting rules.

---

*This PRD should evolve alongside backend contracts and stakeholder feedback. Update the version/date whenever functional scope changes.*
