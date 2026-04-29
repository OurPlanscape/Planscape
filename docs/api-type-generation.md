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

### ✅ Data Layers

| | |
|---|---|
| Backend | `datasets/views.py` — `DatasetViewSet` (tagged `datasets`), `DataLayerViewSet` (tagged `datalayers`) |
| Generated | `api/generated/datasets/datasets.service.ts` — `DatasetsService`, `api/generated/datalayers/datalayers.service.ts` — `DatalayersService` |
| Generated types | `DataLayer`, `BrowseDataLayer`, `DataLayerUrl`, `FindAnything`, `PaginatedDataLayerList`, `PaginatedSearchResultsList`, `SearchResults` |
| Deleted | `services/data-layers.service.ts` (entire file) and its spec |
| Used in | `new-scenario.state.ts`, `scenario-config-overlay.component.ts`, `data-layers.state.service.ts`, `data-layer-tooltip.component.ts`, `base-layers-list.component.ts` |

Hand-written `DataLayer` type in `types/data-sets.ts` is still kept because `DataLayersStateService` uses it as the app-wide domain type (with `toBrowseDataLayer()` adapter). `new-scenario.state.ts.priorityObjectivesDetails$` casts the generated response to hand-written `DataLayer[]` at the boundary so downstream consumers (form controls, `DataLayersStateService.updateSelectedLayers`) keep working.

**Backend changes in `datasets/serializers.py`:**
- `DatasetSimpleSerializer` is positioned BEFORE `DataLayerSerializer` (line ~37), required to avoid `NameError`
- `DataLayerSerializer` has `organization = OrganizationSimpleSerializer()` and `dataset = DatasetSimpleSerializer()` so FK fields generate as nested `{id, name}` objects instead of bare integers
- `@extend_schema_field(serializers.ListField(child=serializers.DictField()))` on `DataLayerSerializer.get_styles` and `BrowseDataLayerSerializer.get_styles`
- `DataLayerUrlSerializer` for the `urls` action response

**Backend changes in `datasets/views.py`:**
- `DataLayerViewSet` tagged `datalayers`
- `urls` action annotated with `@extend_schema(responses={200: DataLayerUrlSerializer})`
- `find_anything` split into per-method decorators (single decorator without `methods=` was applying to both GET and POST and generating wrong POST body):
  ```python
  @extend_schema(methods=["get"], parameters=[FindAnythingSerializer], responses={200: SearchResultsSerializer(many=True)})
  @extend_schema(methods=["post"], request=FindAnythingSerializer, responses={200: SearchResultsSerializer(many=True)})
  ```

**Frontend migrations:**
- `data-layers.state.service.ts`: `getPublicUrl` → `v2DatalayersUrlsRetrieve`, `search` → `v2DatalayersFindAnythingCreate`, injected `DatalayersService`
- `data-layer-tooltip.component.ts`: uses `v2DatalayersUrlsRetrieve(id).pipe(map(d => d.layer_url), take(1), shareReplay(1))`
- `base-layers-list.component.ts`: uses `datasetsBrowsePost(id, { type: VECTOR, module })`
- `new-scenario.state.ts`, `scenario/scenario-config-overlay/scenario-config-overlay.component.ts`: use `v2DatalayersList({ id__in: ids })` with empty-array guard returning `of([])` (the API returns ALL layers if `id__in` is empty)
- Specs use `MockProvider(GeneratedService)` + `spyOn(...)` before `createComponent`

Note: `toBrowseDataLayer()` adapter in `data-layers/data-layers.state.service.ts` still casts `info` and `metadata` as `unknown` because `DataLayerSerializer` doesn't annotate those JSONFields with `@extend_schema_field`. The `styles` cast was fixed (`BrowseDataLayerStylesItem[]` instead of `string`).

### ✅ Auth / dj-rest-auth

`services/auth.service.ts` already wraps `api/generated/dj-rest-auth/` internally. No further migration needed.

---

## Known issues

### `v2/v2.service.ts` suppressed with `@ts-nocheck`

Catch-all for untagged endpoints. Has 6 real type errors (Blob/Object overload mismatches on
endpoints that return file downloads). `scripts/postgen-schema-nocheck.js` injects the
`@ts-nocheck` comment after each `generate:api` run. Both the script and the suppression go
away naturally as endpoints get tagged and move to their own service files.

### `as ModuleEnum` boundary cast

`MAP_MODULE_NAME` injection token is typed as `string` but always holds a `ModuleEnum` value.
The cast in `data-layers/data-layers.state.service.ts` is correct but fragile. Fix: retype the token as `ModuleEnum`.

### Docker uv cache wipes on every restart

`UV_CACHE_DIR=/tmp/uv-cache` and `UV_PYTHON_INSTALL_DIR=/tmp/uv-python` are inside the container's ephemeral `/tmp`, so every `web-1` restart re-downloads ~all Python deps. Also, the `.:/app` volume mount means the container's `.venv` ends up on the Mac host — but its Python symlink points to the Linux `/tmp/uv-python/...` which doesn't exist on Mac, so the next start sees a broken venv.

Proper fix (deferred): named Docker volumes for `.venv` and uv cache.
```yaml
services:
  web:
    volumes:
      - .:/app
      - planscape_venv:/app/.venv
      - uv_cache:/root/.cache/uv
volumes:
  planscape_venv:
  uv_cache:
    driver: local
```
And drop `UV_CACHE_DIR` / `UV_PYTHON_INSTALL_DIR` from `.env` (or repoint cache to `/root/.cache/uv`).

Workaround (what we do today): `rm -rf /Users/pablo/work/sig/Planscape/.venv` whenever `web-1` fails with `ModuleNotFoundError: No module named 'django'`, then `make docker-run`.

### Martin tile server config path

`docker-compose.yml` previously pointed Martin to `/usr/src/app/martin.yaml`, but the volume is mounted at `/app`. Already fixed: `--config /app/martin.yaml`.
