# API Type Generation: drf-spectacular + orval

## Goal

Single source of truth for API types: backend declares the contract via OpenAPI schema,
frontend consumes generated Angular services. No more duplicated interfaces.

**Stack**: `drf-spectacular` (backend schema) + `orval v8` (Angular `HttpClient` service generation).

---

## How it works

1. Django backend at `src/planscape/` exposes `GET /planscape-backend/v2/schema` (drf-spectacular)
2. `npm run generate:api` (run from `src/interface/`) fetches the schema and runs orval
3. Generated output lands in `src/app/api/generated/` — one service file per OpenAPI tag (`tags-split` mode)
4. Untagged endpoints fall into `v2/v2.service.ts` (suppressed with `@ts-nocheck` — see known issues)

**Config**: `src/interface/orval.config.ts`  
**Generated files**: committed to git — schema drift is visible in PR diffs

---

## When to run `generate:api`

Run it when a backend PR adds or changes serializers, views, or `@extend_schema` annotations.
Commit the generated diff in the same PR as the backend change.

`generate:api` requires the backend running at `localhost:8000`. It cannot run in CI without
a live server (future improvement: export schema to a file with `manage.py spectacular --file schema.json`).

---

## Adding a new endpoint to generated types

On the backend (`src/planscape/`):

1. Add `tags=["your-tag"]` to the view's `@extend_schema` or `@extend_schema_view`
2. For `SerializerMethodField` with non-obvious return types, add `@extend_schema_field(...)` to the method
3. If the response is a list but drf-spectacular wraps it in pagination, override `pagination_class`
   as a `@property` returning `None` for that action
4. If one view class handles multiple URL patterns, split into separate view classes —
   otherwise drf-spectacular generates duplicate operation IDs (`operationName2`, `operationName3`, ...)

Then restart the backend and run:
```
npm run generate:api
```

---

## Migrating a hand-written service

1. Tag the backend view (step above), restart, regenerate
2. Update component imports: `@services` → `@app/api/generated/your-tag/your-tag.service`
3. Replace method calls with generated equivalents
4. Update specs — use `MockProvider(GeneratedService)` with no inline overrides, then `spyOn` in `beforeEach` to avoid overload type conflicts
5. Delete the hand-written service file, hand-written type file, and orphaned spec
6. Remove barrel exports from `services/index.ts` and `types/index.ts`

---

## Endpoint / service catalog

### ✅ Invites

| | |
|---|---|
| Backend | `collaboration/views.py` — `CreateInvite`, `InvitationsForObject`, `InvitationDetail` |
| Generated | `api/generated/invites/invites.service.ts` — `InvitesService` |
| Generated types | `UserObjectRole`, `RoleEnum` |
| Deleted | `services/invites.service.ts`, `types/invite.types.ts` (`Invite`, `INVITE_ROLE`) |
| Used in | `home/share-plan-dialog/` |

### ✅ Treatment Goals

| | |
|---|---|
| Backend | `planning/views_v2.py` — `TreatmentGoalViewSet` |
| Generated | `api/generated/treatment-goals/treatment-goals.service.ts` — `TreatmentGoalsService` |
| Generated types | `TreatmentGoal` |
| Deleted | `services/treatment-goals.service.ts`, `ScenarioGoal` from `types/scenario.types.ts` |
| Used in | `scenario-creation/scenario-creation.component.ts`, `scenario-creation/treatment-goal-selector/`, `scenario/scenario-helper.ts` |

### ⚠️ Planning Areas (tagged, migration blocked)

| | |
|---|---|
| Backend | `planning/views_v2.py` — `PlanningAreaViewSet`, `CreatorViewSet` |
| Generated | `api/generated/planning-areas/planning-areas.service.ts` — `PlanningAreasService` |
| Generated types | `PlanningArea`, `ListPlanningArea`, `CreatePlanningArea`, `ListCreator`, `PaginatedListPlanningAreaList` |
| Hand-written (still in use) | `services/plan.service.ts`, `types/plan.types.ts` (`Plan`, `PreviewPlan`, `Creator`, `CreatePlanPayload`) |
| Used in | `plan/plan.state.ts`, `standalone/planning-areas/`, `standalone/planning-area-menu/`, `explore/create-plan-dialog/` + 20 other files |

**Blockers:**
- `PlanningArea.permissions` generates as `string` but backend returns `string[]` — needs `@extend_schema_field` on `get_permissions` in `planning/serializers.py`
- `PlanningArea.geometry` generates as `unknown` — needs `@extend_schema_field`
- `Plan.area_m2` exists in hand-written type but not in `PlanningArea` — verify if still needed
- `plan.service.ts#uploadGeometryForNewScenario` hits `/v2/scenarios/upload_shapefiles/` — wrong service, move to `scenario.service.ts` first
- `Plan` referenced in 20+ component files — migrating requires touching all of them

### 🔲 Scenarios

| | |
|---|---|
| Backend | `planning/views_v2.py` — `ScenarioViewSet` (no `tags` yet) |
| Generated | None (lives in `v2/v2.service.ts`) |
| Hand-written | `services/scenario.service.ts` (199 lines), `types/scenario.types.ts` |
| Used in | Many components throughout the app |

Tag the backend first and inspect generated types before migrating — `Scenario` type is embedded as deeply as `Plan`.

### 🔲 Treatments

| | |
|---|---|
| Backend | `impacts/views.py` — `TreatmentPlanViewSet` (no `tags` yet) |
| Generated | None (lives in `v2/v2.service.ts`) |
| Hand-written | `services/treatments.service.ts` (160 lines), `types/treatment.types.ts` |
| Used in | `treatments/` feature module |

### 🔲 Notes

| | |
|---|---|
| Backend | `planning/views.py` — `PlanningAreaNotes` (4 URL patterns on one view class, no tags); `impacts/views.py` — `TreatmentPlanNoteViewSet` (no tags) |
| Generated | Partially — drf-spectacular already generates `planningPlanningAreaNoteRetrieve2/3` etc. because of the 4-URL problem |
| Hand-written | `services/notes.service.ts` (`BaseNotesService`, `PlanningAreaNotesService`, `TreatmentPlanNotesService`); `services/plan-notes.service.ts` (`PlanNotesService` — stateful BehaviorSubject wrapper over the same endpoint) |

**Blockers:**
- `PlanningAreaNotes` has 4 URL patterns on one view → must split into separate view classes first
- `PlanNotesService` is stateful (`notes$` BehaviorSubject) — state management must move to a component before the HTTP calls can be replaced

### 🔲 Data Layers (partial)

| | |
|---|---|
| Backend | `datasets/views.py` — `DatasetViewSet` (tagged `datasets`) |
| Generated | `api/generated/datasets/datasets.service.ts` — `DatasetsService.datasetsBrowsePost` |
| Hand-written | `services/data-layers.service.ts` — 5 methods still using hand-written HTTP: `search`, `getPublicUrl`, `getDataLayerById`, `getDataLayersByIds`, `listBaseLayersByDataSet` |

`datasetsBrowsePost` is wired via `toBrowseDataLayer()` adapter in `data-layers/data-layers.state.service.ts`.
The adapter still has `as unknown as` casts for `styles`, `info`, and `metadata` — needs `@extend_schema_field`
on those fields in `datasets/serializers.py` before the casts can be removed.

### ✅ Auth / dj-rest-auth

`services/auth.service.ts` already wraps `api/generated/dj-rest-auth/` internally. No further migration needed.

---

## Known issues

### `v2/v2.service.ts` suppressed with `@ts-nocheck`

Catch-all for untagged endpoints. Has 6 real type errors (Blob/Object overload mismatches on
endpoints that return file downloads). `scripts/postgen-schema-nocheck.js` injects the
`@ts-nocheck` comment after each `generate:api` run. Both the script and the suppression go
away naturally as endpoints get tagged and move to their own service files.

### `DataLayersStateService` spec missing mock

`data-layers/data-layers.state.service.spec.ts` has `MockProvider(DataLayersService)` but not
`MockProvider(DatasetsService)`. The spec will fail when run. Add `MockProvider(DatasetsService)`
to the providers array.

### `as ModuleEnum` boundary cast

`MAP_MODULE_NAME` injection token is typed as `string` but always holds a `ModuleEnum` value.
The cast in `data-layers/data-layers.state.service.ts` is correct but fragile. Fix: retype the token as `ModuleEnum`.
