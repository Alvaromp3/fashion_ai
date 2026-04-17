# Software Engineering & Quality Management — Fashion AI

This document maps the course deliverables to this repository: requirements, design, prototype, tests (unit, integration, E2E), quality analysis, DevOps, defects, traceability, and reflection.

---

## 1. Problem and proposed solution

**Problem:** Building and maintaining a personal digital wardrobe is tedious: users upload many garment photos, need consistent metadata (garment type, colour), and want outfit guidance without manually tagging every item.

**Users:** Fashion-conscious end users; optional operators deploying the stack (MongoDB, Auth0, ML service).

**Importance:** Consistent labels improve search, filtering, and downstream recommendation quality; security around uploads and external URLs reduces abuse risk.

**Solution (Fashion AI):** A three-tier system — React frontend ([`frontend/`](../frontend/)), Express API ([`backend/`](../backend/)), Python ML service with ViT ([`ml-service/`](../ml-service/)), and MongoDB — supports upload, classification, wardrobe CRUD, and optional Auth0 per-user data.

---

## 2. Development approach

**Framework:** Short Agile iterations (1–2 week sprints), backlog in GitHub Issues, definition of done includes tests and CI green.

**Team (example):** Product owner, full-stack engineer, ML/DevOps engineer, QA — or solo with explicit role rotation and peer review via PRs.

**Justification:** Frontend, API, and ML change together; frequent integration and automated tests reduce regression risk across service boundaries.

---

## 3. Requirements

### Functional (testable)

| ID | Requirement |
|----|----------------|
| FR-1 | Public `/uploads/...` URLs shall resolve to filesystem paths only under the configured uploads root; traversal segments shall be rejected. |
| FR-2 | `POST /api/classify` shall return **400** with a JSON error when no image file is provided. |
| FR-3 | ViT English class labels (e.g. Sneaker, T-shirt) shall map to canonical wardrobe `tipo` values (e.g. zapatos, superior). |
| FR-4 | ML classify POST URLs shall be built only from an allowlisted set of path suffixes (`/classify`, `/classify-vit`). |
| FR-5 | Mirror image URLs shall accept only safe `data:image/...;base64,...` or non-private **https** hosts. |
| FR-6 | `GET /api/health` shall return JSON including `mongodb` connection state and overall `status` (`OK` or `DEGRADED`). |
| FR-7 | First load of the SPA shall render either the main app shell (`.app-shell`) or the documented Auth0 configuration message. |

### Non-functional

- **NFR-Security:** Path and URL validation for uploads and outbound ML URLs.
- **NFR-Reliability:** ML health and classify routes degrade gracefully when ML is unavailable (503 with hint).
- **NFR-Maintainability:** Pure helpers in `backend/utils/` covered by fast unit tests.

---

## 4. System design

**Components:** `frontend` (Vite + React + Auth0), `backend` (Express, Mongoose, routes under `backend/routes/`), `ml-service` (Flask `fashion_ml.flask_app`), MongoDB.

**Interactions:** Browser → REST JSON/multipart → Express → optional HTTP to ML → MongoDB persistence for wardrobe entities.

**Architecture (conceptual):** See plan diagram in course materials; entry HTTP surface is [`backend/app.js`](../backend/app.js); process listen and DB connect remain in [`backend/server.js`](../backend/server.js).

---

## 5. Prototype implementation

The working prototype is the existing Fashion AI codebase. Highlights tied to requirements:

- **FR-1 / FR-5:** [`backend/utils/safePath.js`](../backend/utils/safePath.js), [`backend/utils/safeMirrorImageUrl.js`](../backend/utils/safeMirrorImageUrl.js)
- **FR-2 / FR-3:** [`backend/routes/classify.js`](../backend/routes/classify.js), [`backend/utils/vitClassToTipo.js`](../backend/utils/vitClassToTipo.js)
- **FR-4:** [`backend/utils/safeOutboundUrl.js`](../backend/utils/safeOutboundUrl.js)
- **FR-6:** [`backend/app.js`](../backend/app.js) `/api/health`
- **FR-7:** [`frontend/src/App.jsx`](../frontend/src/App.jsx), [`frontend/src/main.jsx`](../frontend/src/main.jsx)

---

## 6. Unit testing

**Backend:** Vitest, `globals: true`, tests under [`backend/test/unit/`](../backend/test/unit/). Examples: `safePath.test.js`, `vitClassToTipo.test.js`.

**Frontend:** Vitest + jsdom, tests under [`frontend/src/**/*.test.js`](../frontend/src/lib/classificationDisplay.test.js).

**ML:** pytest, [`ml-service/tests/`](../ml-service/tests/), `PYTHONPATH=src`, `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` to avoid conflicting global pytest plugins.

**Sample I/O (FR-3):** Input `vitClassToTipo('Sneaker')` → expected `zapatos`; input `vitClassToTipo('spaceship')` → `desconocido` (see [`backend/test/unit/vitClassToTipo.test.js`](../backend/test/unit/vitClassToTipo.test.js)).

---

## 7. Integration testing

**Backend (Supertest + mongodb-memory-server):** [`backend/test/integration/`](../backend/test/integration/)

| ID | Case |
|----|------|
| IT-A1 | `GET /api/health` with in-memory Mongo → `status` **OK**, `mongodb` **connected** |
| IT-A2 | `POST /api/classify` with fixture JPEG + mocked `axios.post` → **200** and mapped `tipo` |
| IT-A3 | `GET /api/ml-health` with mocked `axios.get` → **200** or **503** paths |
| IT-A4 | `GET /api/me` when Auth0 disabled → **200**, `sub: anonymous` (skipped when Auth0 is configured) |

**ML (Flask test client):** [`ml-service/tests/test_flask_integration.py`](../ml-service/tests/test_flask_integration.py) — `/health` and `/` with stubbed `models.vit` (IT-B1).

---

## 7b. End-to-end testing

**Tool:** Playwright ([`playwright.config.mjs`](../playwright.config.mjs), [`e2e/smoke.spec.js`](../e2e/smoke.spec.js)).

| ID | Scenario |
|----|----------|
| E2E-1 | Open `/` — visible `.app-shell` **or** “Auth0 not configured” heading |
| E2E-2 | `request.get('http://127.0.0.1:4000/api/health')` — JSON includes `mongodb` |

**Local / CI:** `webServer` starts backend + frontend via `concurrently` (unless `E2E_SKIP_SERVERS` is set). CI provides MongoDB service and sets `MONGODB_URI` (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

---

## 8. Code quality and analysis

**Linting:** ESLint 8 — `npm run lint` in `backend/` and `frontend/`.

**Recent findings (representative):**

1. **Warnings only in legacy routes** (e.g. unused locals in `outfits.js`, `prendas.js`) — low risk; can be cleaned incrementally.
2. **`backend/app.js` vs `server.js` split** — improves testability (Supertest) and separates transport from HTTP graph.
3. **Complexity hotspot:** [`backend/routes/classify.js`](../backend/routes/classify.js) combines HEIC conversion, ML I/O, and response shaping — candidate for further decomposition if change rate increases.

**Reflection on complexity:** Unit tests on pure utils keep the highest-risk logic (path/URL safety, label mapping) cheap to verify; integration tests guard the Express/axios boundary without loading TensorFlow in Node.

---

## 9. DevOps plan

- **Branching:** `main` + short-lived feature branches; PR required for merge.
- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — parallel jobs: `backend` (lint+test), `frontend` (lint+test), `ml-service` (pytest with minimal Flask/Pillow install), `e2e` (Mongo service + Playwright Chromium).
- **Release:** Frontend static build to Cloudflare Pages; backend and ML per existing deployment docs ([`docs/DEPLOY_CLOUDFLARE.md`](DEPLOY_CLOUDFLARE.md), etc.).

---

## 10. Defect management

**Lifecycle:** New → Triaged → In Progress → Fixed → Verified in CI → Closed.

| Type | Example | Cause | Fix | Verification |
|------|---------|-------|-----|----------------|
| **Functional** | Wrong `tipo` for a new ViT synonym | Map missing in `vitClassToTipo` | Add key to map in [`vitClassToTipo.js`](../backend/utils/vitClassToTipo.js) | Unit test in `vitClassToTipo.test.js` + IT-A2 |
| **Integration** | `/api/ml-health` always 503 in staging | `ML_SERVICE_URL` wrong / Space asleep | Correct env; document wake hint | IT-A3 with mocked success vs failure |
| **Data/validation** | Crafted `/uploads/../../` URL | Missing path hardening | `resolveUploadsPublicPath` returns null | `safePath.test.js` + static route 404 behaviour |

---

## 11. Traceability matrix

| Req | Code | Unit tests | Integration | E2E |
|-----|------|--------------|---------------|-----|
| FR-1 | `resolveUploadsPublicPath` | `backend/test/unit/safePath.test.js` | — | — |
| FR-2 | `processAndClassify` no-file branch | — | `backend/test/integration/classify.test.js` | — |
| FR-3 | `vitClassToTipo` | `backend/test/unit/vitClassToTipo.test.js` + `ml-service/tests/test_labels.py` | `classify.test.js` | — |
| FR-4 | `buildMlClassifyUrl` | `safeOutboundUrl.test.js` | `classify.test.js` (uses allowlisted path) | — |
| FR-5 | `validateMirrorImageUrl` | `safeMirrorImageUrl.test.js` | — | — |
| FR-6 | `/api/health` | — | `health.test.js` | `e2e/smoke.spec.js` E2E-2 |
| FR-7 | `App.jsx` / `main.jsx` | optional RTL | — | `e2e/smoke.spec.js` E2E-1 |

---

## 12. Reflection

**Tradeoffs:** Mocking `axios` keeps Node integration tests fast and deterministic but does not catch real ML JSON drift — contract tests or occasional staging tests against a real Space would complement. `mongodb-memory-server` first download is large; CI caches help after the first run. Playwright E2E increases CI time but validates the real browser and CORS/proxy path.

**Improvements:** Add MSW-based component integration tests; add `@slow` ML tests that load ViT on a schedule; tighten ESLint warnings to zero on touched files.

**Learning:** Exporting the Express `app` from `app.js` unlocked Supertest and made requirements traceable from HTTP down to pure functions.

---

## Appendix A — Commands

| Scope | Command |
|-------|---------|
| Backend unit+integration | `cd backend && npm test` |
| Frontend unit | `cd frontend && npm test` |
| ML unit+integration | `node scripts/run-ml-tests.js` (repo root) or `cd ml-service && set PYTHONPATH=src&& set PYTEST_DISABLE_PLUGIN_AUTOLOAD=1&& python -m pytest tests -q` |
| E2E | `npm run test:e2e` (repo root; set `MONGODB_URI` if needed) |
| All unit (no E2E) | `npm test` (root) then `npm run test:ml` |

---

## Appendix B — 10-minute presentation outline

1. **Problem & users** (1 min) — wardrobe friction, metadata consistency.  
2. **Agile approach & roles** (1 min).  
3. **One vertical slice:** FR-3 → [`vitClassToTipo.js`](../backend/utils/vitClassToTipo.js) → [`vitClassToTipo.test.js`](../backend/test/unit/vitClassToTipo.test.js) (2 min live IDE).  
4. **Integration:** IT-A2 classify + mocked ML (1 min) — show `classify.test.js`.  
5. **E2E:** Playwright smoke E2E-1 / E2E-2 (1 min) — show `e2e/smoke.spec.js` or HTML report.  
6. **One defect** — Data/validation row from §10 (1 min).  
7. **Traceability matrix** screenshot — §11 (30 s).  
8. **CI pipeline** — `.github/workflows/ci.yml` (1 min).  
9. **Q&A buffer** (1 min).
