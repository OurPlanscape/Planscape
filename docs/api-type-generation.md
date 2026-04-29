# API Type Generation: drf-spectacular + orval

## Goal

Single source of truth for API types: backend declares the contract via OpenAPI schema,
frontend consumes generated Angular services. No more duplicated interfaces.

**Stack**: `drf-spectacular` (backend schema) + `orval v8` (Angular `HttpClient` service generation).

---

## How it works

1. Django backend at `src/planscape/` exposes `GET /planscape-backend/v2/schema` (drf-spectacular)
2. `make export-schema` writes the schema to `src/interface/api-schema.yaml` (committed to git)
3. `npm run generate:api` (run from `src/interface/`) reads `api-schema.yaml` and runs orval
4. Generated output lands in `src/app/api/generated/` — one service file per OpenAPI tag (`tags-split` mode)
5. Untagged endpoints fall into `v2/v2.service.ts` — typechecks clean today, will shrink as more viewsets get tagged

**Config**: `src/interface/orval.config.ts`  
**Schema**: `src/interface/api-schema.yaml` — committed; refresh with `make export-schema`  
**Generated files**: committed to git — schema drift is visible in PR diffs

The orval config strips the leading `v2_` segment from every `operationId` and converts the rest to camelCase. drf-spectacular emits IDs like
`v2_datalayers_list` (snake_case, prefixed with the URL segment); the override produces `datalayersList` so call sites read
`this.datalayersService.datalayersList(...)` instead of `v2DatalayersList(...)`. The `v2` lives in the Django URL config and adds noise to every
consumer.

---

## When to run `generate:api`

Run it when a backend PR adds or changes serializers, views, or `@extend_schema` annotations.

Two-step flow (run both, commit both diffs in the same PR as the backend change):

```
make export-schema                  # backend → api-schema.yaml (needs Docker + a working web container)
cd src/interface && npm run generate:api   # api-schema.yaml → src/app/api/generated/ (offline)
```

Because the schema is committed, `npm run generate:api` runs offline — useful for CI to verify the
generated output is in sync with the schema, no live backend required.

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
2. Update component imports: `@services` → `@api/your-tag/your-tag.service` (the `@api` alias maps to `src/app/api/generated`; types live in
   `@api/planscapeAPI.schemas`)
3. Replace method calls with generated equivalents
4. Update specs — use `MockProvider(GeneratedService)` with no inline overrides, then `spyOn` in `beforeEach` to avoid overload type conflicts
5. Delete the hand-written service file, hand-written type file, and orphaned spec
6. Remove barrel exports from `services/index.ts` and `types/index.ts`

---

## Endpoint / service catalog

### ✅ Invites

|                 |                                                                                       |
|-----------------|---------------------------------------------------------------------------------------|
| Backend         | `collaboration/views.py` — `CreateInvite`, `InvitationsForObject`, `InvitationDetail` |
| Generated       | `api/generated/invites/invites.service.ts` — `InvitesService`                         |
| Generated types | `UserObjectRole`, `RoleEnum`                                                          |
| Deleted         | `services/invites.service.ts`, `types/invite.types.ts` (`Invite`, `INVITE_ROLE`)      |
| Used in         | `home/share-plan-dialog/`                                                             |

### ✅ Treatment Goals

|                 |                                                                                                                                 |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------|
| Backend         | `planning/views_v2.py` — `TreatmentGoalViewSet`                                                                                 |
| Generated       | `api/generated/treatment-goals/treatment-goals.service.ts` — `TreatmentGoalsService`                                            |
| Generated types | `TreatmentGoal`                                                                                                                 |
| Deleted         | `services/treatment-goals.service.ts`, `ScenarioGoal` from `types/scenario.types.ts`                                            |
| Used in         | `scenario-creation/scenario-creation.component.ts`, `scenario-creation/treatment-goal-selector/`, `scenario/scenario-helper.ts` |

### ⚠️ Planning Areas (tagged, migration blocked)

|                             |                                                                                                                                      |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| Backend                     | `planning/views_v2.py` — `PlanningAreaViewSet`, `CreatorViewSet`                                                                     |
| Generated                   | `api/generated/planning-areas/planning-areas.service.ts` — `PlanningAreasService`                                                    |
| Generated types             | `PlanningArea`, `ListPlanningArea`, `CreatePlanningArea`, `ListCreator`, `PaginatedListPlanningAreaList`                             |
| Hand-written (still in use) | `services/plan.service.ts`, `types/plan.types.ts` (`Plan`, `PreviewPlan`, `Creator`, `CreatePlanPayload`)                            |
| Used in                     | `plan/plan.state.ts`, `standalone/planning-areas/`, `standalone/planning-area-menu/`, `explore/create-plan-dialog/` + 20 other files |

**Blockers:**

- `PlanningArea.permissions` generates as `string` but backend returns `string[]` — needs `@extend_schema_field` on `get_permissions` in
  `planning/serializers.py`
- `PlanningArea.geometry` generates as `unknown` — needs `@extend_schema_field`
- `Plan.area_m2` exists in hand-written type but not in `PlanningArea` — verify if still needed
- `plan.service.ts#uploadGeometryForNewScenario` hits `/v2/scenarios/upload_shapefiles/` — wrong service, move to `scenario.service.ts` first
- `Plan` referenced in 20+ component files — migrating requires touching all of them

### 🔲 Scenarios

|              |                                                                       |
|--------------|-----------------------------------------------------------------------|
| Backend      | `planning/views_v2.py` — `ScenarioViewSet` (no `tags` yet)            |
| Generated    | None (lives in `v2/v2.service.ts`)                                    |
| Hand-written | `services/scenario.service.ts` (199 lines), `types/scenario.types.ts` |
| Used in      | Many components throughout the app                                    |

Tag the backend first and inspect generated types before migrating — `Scenario` type is embedded as deeply as `Plan`.

### 🔲 Treatments

|              |                                                                          |
|--------------|--------------------------------------------------------------------------|
| Backend      | `impacts/views.py` — `TreatmentPlanViewSet` (no `tags` yet)              |
| Generated    | None (lives in `v2/v2.service.ts`)                                       |
| Hand-written | `services/treatments.service.ts` (160 lines), `types/treatment.types.ts` |
| Used in      | `treatments/` feature module                                             |

### 🔲 Notes

|              |                                                                                                                                                                                                                            |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Backend      | `planning/views.py` — `PlanningAreaNotes` (4 URL patterns on one view class, no tags); `impacts/views.py` — `TreatmentPlanNoteViewSet` (no tags)                                                                           |
| Generated    | Partially — drf-spectacular already generates `planningPlanningAreaNoteRetrieve2/3` etc. because of the 4-URL problem                                                                                                      |
| Hand-written | `services/notes.service.ts` (`BaseNotesService`, `PlanningAreaNotesService`, `TreatmentPlanNotesService`); `services/plan-notes.service.ts` (`PlanNotesService` — stateful BehaviorSubject wrapper over the same endpoint) |

**Blockers:**

- `PlanningAreaNotes` has 4 URL patterns on one view → must split into separate view classes first
- `PlanNotesService` is stateful (`notes$` BehaviorSubject) — state management must move to a component before the HTTP calls can be replaced

### ⚠️ Data Layers (services done, hand-written `DataLayer` type still around)

|                 |                                                                                                                                                                     |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Backend         | `datasets/views.py` — `DatasetViewSet` (tagged `datasets`), `DataLayerViewSet` (tagged `datalayers`)                                                                |
| Generated       | `api/generated/datasets/datasets.service.ts` — `DatasetsService`, `api/generated/datalayers/datalayers.service.ts` — `DatalayersService`                            |
| Generated types | `DataLayer`, `BrowseDataLayer`, `DataLayerUrl`, `FindAnything`, `PaginatedDataLayerList`, `PaginatedSearchResultsList`, `SearchResults`                             |
| Deleted         | `services/data-layers.service.ts` (entire file) and its spec                                                                                                        |
| Used in         | `new-scenario.state.ts`, `scenario-config-overlay.component.ts`, `data-layers.state.service.ts`, `data-layer-tooltip.component.ts`, `base-layers-list.component.ts` |

**Backend changes in `datasets/serializers.py`:**

- `DatasetSimpleSerializer` is positioned BEFORE `DataLayerSerializer` (line ~37), required to avoid `NameError`
- `DataLayerSerializer` has `organization = OrganizationSimpleSerializer()` and `dataset = DatasetSimpleSerializer()` so FK fields generate as nested
  `{id, name}` objects instead of bare integers
- `@extend_schema_field(serializers.ListField(child=serializers.DictField()))` on `DataLayerSerializer.get_styles` and
  `BrowseDataLayerSerializer.get_styles`
- `info` and `metadata` declared explicitly as `extend_schema_field(OpenApiTypes.OBJECT)` over `DictField` so the generated TS becomes
  `Record<string, unknown> | null` instead of `unknown | null`
- `DataLayerUrlSerializer` for the `urls` action response

**Backend changes in `datasets/views.py`:**

- `DataLayerViewSet` tagged `datalayers`
- `urls` action annotated with `@extend_schema(responses={200: DataLayerUrlSerializer})`
- `find_anything` split into per-method decorators (single decorator without `methods=` was applying to both GET and POST and generating wrong POST
  body):
  ```python
  @extend_schema(methods=["get"], parameters=[FindAnythingSerializer], responses={200: SearchResultsSerializer(many=True)})
  @extend_schema(methods=["post"], request=FindAnythingSerializer, responses={200: SearchResultsSerializer(many=True)})
  ```

**Frontend migrations (services):** all generated method names follow the post-orval-rename naming (no `v2` prefix):

- `data-layers.state.service.ts`: `getPublicUrl` → `datalayersUrlsRetrieve`, `search` → `datalayersFindAnythingCreate`, browse → `datasetsBrowsePost`,
  inject `DatalayersService` + `DatasetsService`
- `data-layer-tooltip.component.ts`: uses `datalayersUrlsRetrieve(id).pipe(map(d => d.layer_url), take(1), shareReplay(1))`
- `base-layers-list.component.ts`: uses `datasetsBrowsePost(id, { type: VECTOR, module })`
- `new-scenario.state.ts`, `scenario/scenario-config-overlay/scenario-config-overlay.component.ts`: use `datalayersList({ id__in: ids })` with
  empty-array guard returning `of([])` (the API returns ALL layers if `id__in` is empty)
- Specs use `MockProvider(GeneratedService)` + `spyOn(...)` before `createComponent`

**Pending: drop the hand-written `DataLayer` type (Option A in the cleanup plan).** Done so far:

- `Info` renamed to `RasterInfo` and tagged as raster-only; `DataLayer.info` loosened from `Info` to `Record<string, unknown> | null`; three read
  sites (`data-layer-tooltip`, `assign-favorability`, `map-data-layer`) cast to `RasterInfo` at use site.
- `toBrowseDataLayer()` adapter no longer needs the `as unknown as Info` cast; `metadata` and `styles` still go through `as unknown as` because
  hand-written `Metadata` and `Styles` add structure the loose JSON type doesn't carry.

Still on the to-do list (~20 import sites):

- Switch every `import { DataLayer } from '@types'` to `import { DataLayer } from '@api/planscapeAPI.schemas'` (or `BrowseDataLayer` where the source
  is the browse endpoint).
- Refactor `BaseLayer` in `types/data-sets.ts` so it doesn't `extends Omit<DataLayer, 'styles' | 'geometry'>` against the hand-written shape.
- Delete `interface DataLayer` + `interface Styles` (and probably `interface Metadata`) from `types/data-sets.ts` once the readers narrow at the use
  site like `RasterInfo` does.
- Drop `toBrowseDataLayer()` entirely — `DataLayersStateService.dataTree$`, `selectedDataLayers$`, `viewedDataLayer$` become `BrowseDataLayer`-typed
  end to end.
- Remove the `as unknown as DataLayer[]` boundary cast in `new-scenario.state.ts` (the consumers there only read `.name` so the generated type is
  fine).
- `types/data-sets.ts` will still own `BaseDataSet`, `DataSet`, `BaseLayer`, `SearchResult`/`SearchQuery` (until those migrations land too) and the
  narrowing helpers `RasterInfo` / `InfoStats` / `Metadata` / `Styles` / `StyleJson`.

### ✅ Auth / dj-rest-auth

`services/auth.service.ts` already wraps `api/generated/dj-rest-auth/` internally. No further migration needed.
