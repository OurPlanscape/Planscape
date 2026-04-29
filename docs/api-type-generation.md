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

### ⚠️ Climate Foresight (half-baked — generated types lie, hand-written is what consumers use)

|              |                                                                                                                                                                            |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Backend      | `climate_foresight/views.py` — `ClimateForesightRunViewSet`, `ClimateForesightPillarViewSet` (no `tags` yet)                                                               |
| Generated    | Generated types exist (`ClimateForesightRun`, `ClimateForesightPillar`, `ClimateForesightRunInputDataLayer`, `ClimateForesightRunList`); calls live in `v2/v2.service.ts`  |
| Hand-written | `services/climate-foresight.service.ts` (~200 lines), `types/climate-foresight.types.ts` (16 interfaces, including `Pillar` / `ClimateForesightPillar` near-duplicates)    |
| Used in      | `plan/climate-foresight/` feature module — `data-layer-selection`, `assign-favorability`, `assign-pillars`, `analysis` and supporting components                            |

**Why "half-baked":** the generated `ClimateForesightRun` interface has three `SerializerMethodField`-backed properties (`pillar_rollups`,
`landscape_rollup`, `promote`) typed as `string` because drf-spectacular can't infer their return shape — the backend serializer has no
`@extend_schema_field` annotation on those methods. Likewise `ClimateForesightRunInputDataLayer.statistics` is `unknown | null` because the
serializer declares it as `JSONField`. The hand-written types are what consumers actually use and they encode the real shapes.

**Blockers / cleanup needed:**

- Backend: tag both viewsets, then add `@extend_schema_field` to `ClimateForesightRunSerializer.get_pillar_rollups` /
  `get_landscape_rollup` / `get_promote` pointing at proper child serializers (`ClimateForesightPillarRollupSerializer`,
  `ClimateForesightLandscapeRollupSerializer`, `ClimateForesightPromoteSerializer` — all already exist on the backend).
- Backend: type `statistics` properly via a `LayerStatisticsSerializer` (the shape is documented in the field's `help_text`).
- Frontend: the hand-written `Pillar` and generated `ClimateForesightPillar` are near-duplicates with field-name drift (`run` vs `run_id`, missing
  `created_by`, missing `order` default) — pick the generated as canonical once the schema is right and drop the hand-written one.
- Frontend: `climate-foresight.service.ts` hand-rolls `http.post`/`http.get` calls; once tagged, swap for the generated client (same pattern as
  the eventual auth migration).

### 🔲 Notes

|              |                                                                                                                                                                                                                            |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Backend      | `planning/views.py` — `PlanningAreaNotes` (4 URL patterns on one view class, no tags); `impacts/views.py` — `TreatmentPlanNoteViewSet` (no tags)                                                                           |
| Generated    | Partially — drf-spectacular already generates `planningPlanningAreaNoteRetrieve2/3` etc. because of the 4-URL problem                                                                                                      |
| Hand-written | `services/notes.service.ts` (`BaseNotesService`, `PlanningAreaNotesService`, `TreatmentPlanNotesService`); `services/plan-notes.service.ts` (`PlanNotesService` — stateful BehaviorSubject wrapper over the same endpoint) |

**Blockers:**

- `PlanningAreaNotes` has 4 URL patterns on one view → must split into separate view classes first
- `PlanNotesService` is stateful (`notes$` BehaviorSubject) — state management must move to a component before the HTTP calls can be replaced

### ✅ Data Layers

|                 |                                                                                                                                                                     |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Backend         | `datasets/views.py` — `DatasetViewSet` (tagged `datasets`), `DataLayerViewSet` (tagged `datalayers`)                                                                |
| Generated       | `api/generated/datasets/datasets.service.ts` — `DatasetsService`, `api/generated/datalayers/datalayers.service.ts` — `DatalayersService`                            |
| Generated types | `DataLayer`, `BrowseDataLayer`, `DataLayerUrl`, `FindAnything`, `PaginatedDataLayerList`, `PaginatedSearchResultsList`, `SearchResults`, `RasterInfo`, `RasterInfoStats`, `RasterStyleData`, `RasterStyleEntryOutput`, `RasterStyleNoDataOutput`, `RasterStyleOutput`, `MapTypeEnum`                             |
| Deleted         | `services/data-layers.service.ts` and spec; `interface DataLayer` from `types/data-sets.ts`                                                                         |
| Used in         | `new-scenario.state.ts`, `scenario-config-overlay.component.ts`, `data-layers.state.service.ts`, `data-layer-tooltip.component.ts`, `base-layers-list.component.ts` |

**Backend changes in `datasets/serializers.py`:**

- `DatasetSimpleSerializer` is positioned BEFORE `DataLayerSerializer` (line ~37), required to avoid `NameError`
- `DataLayerSerializer` has `organization = OrganizationSimpleSerializer()` and `dataset = DatasetSimpleSerializer()` so FK fields generate as nested
  `{id, name}` objects instead of bare integers
- `info` and `styles[].data` are properly typed via dedicated output serializers (`RasterInfoSerializer` / `RasterStyleOutputSerializer`):
  - `info` and `styles` are declared as `SerializerMethodField`, with `@extend_schema_field(RasterInfoSerializer(allow_null=True))` and
    `@extend_schema_field(RasterStyleOutputSerializer(many=True))` respectively. (Setting `extend_schema_field` on a plain `DictField` works for
    `OpenApiTypes.*` but doesn't pull a serializer ref into `components.schemas` — the schema renderer only walks `SerializerMethodField`s.)
  - The schema is honest for the raster case (the overwhelmingly common one). Vector layers store ogrinfo in `info` and a different `{fill-color,
    fill-outline-color, fill-opacity}` shape in `styles[].data` — the schema "lies" for them, but vector consumers cast through `BaseLayer`
    at the use site so the generated raster types never reach them.
- `metadata` is still declared as `extend_schema_field(OpenApiTypes.OBJECT)` over `DictField` — it's heterogenous JSON (RRK ISO-19115-style metadata
  embedded as a sub-object, plus `modules` keyed by module name). Frontend treats it as `Record<string, any>` and accesses keys via brackets.
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

**Cleanup notes:**

- `interface DataLayer` deleted from `types/data-sets.ts`; consumers now import generated `DataLayer` from `@api/planscapeAPI.schemas` (or
  `BrowseDataLayer` where the source is the browse endpoint — `data-layers.state.service.ts` and everything downstream).
- `BaseLayer` is now an explicit interface (no longer `extends Omit<DataLayer, ...>`); the file-level comment notes that it represents the narrowed,
  cast shape returned by `datasets/{id}/browse` for vector layers.
- `toBrowseDataLayer()` adapter is gone — `DataLayersStateService.dataTree$`, `selectedDataLayers$`, `viewedDataLayer$` are `BrowseDataLayer`-typed
  end to end.
- `as unknown as DataLayer[]` boundary cast removed from `new-scenario.state.ts`; `priorityObjectivesDetails$` / `coBenefitsDetails$` flow generated
  `DataLayer[]` directly.
- Hand-written `RasterInfo` / `InfoStats` / `Styles` / `StyleJson` / `Entry` / `NoData` are gone — consumers import generated `RasterInfo` /
  `RasterInfoStats` / `RasterStyleOutput` / `RasterStyleData` / `RasterStyleEntryOutput` / `RasterStyleNoDataOutput` from
  `@api/planscapeAPI.schemas` and the `as RasterInfo | null` / `as unknown as Styles[]` casts at call sites are gone.
- `Metadata` is now `Record<string, any>` — the previous interface added zero protection (its index signature `[key: string]: any` already
  allowed any access). Read sites cast `dl.metadata as Metadata | null` and access keys via brackets to satisfy `noPropertyAccessFromIndexSignature`.
- `RasterColorType` is re-exported from `MapTypeEnum`; `LayerStyleEntry` and `ColorLegendInfo` are UI-only and stay.
- The hand-written `DataSet` alias is gone; consumers use generated `Dataset` directly. `BaseDataSet` stays as
  `Pick<Dataset, 'id' | 'name' | 'organization'>` because the data-layers UI passes a 3-field shape that doesn't fit `DatasetSimple` (no
  `organization`).
- `types/data-sets.ts` still owns `BaseLayer` (narrowed cast view of `BrowseDataLayer` for vector layers) and `SearchResult` / `DataLayerSearchResult` /
  `DataSetSearchResult` / `SearchQuery` — the generated `SearchResults` has `data: unknown`, so the hand-written discriminated union is more useful than
  what's generated and should stick around until the search endpoint migrates.

### 🔲 Auth / dj-rest-auth

|              |                                                                                                                                          |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------|
| Backend      | `dj-rest-auth` URL routes — already in the generated schema                                                                              |
| Generated    | `api/generated/dj-rest-auth/dj-rest-auth.service.ts` — `DjRestAuthService` (zero consumers today)                                        |
| Hand-written | `services/auth.service.ts` — 416 lines of raw `HttpClient` calls against `${backend_endpoint}/dj-rest-auth/*`                             |
| Used in      | App-wide (login flows, password reset, registration, token refresh, route guards)                                                        |

The generated `DjRestAuthService` exists but `auth.service.ts` hand-rolls every call. Migration would replace the raw `http.post`/`http.get` calls with
the generated methods — mostly a 1:1 swap, but the auth flow has lots of side effects (cookie management, BehaviorSubject updates, redirect logic)
so the wrapper class probably stays even after the swap.

### Residual data-layers debt (sub-endpoint cleanup, not a full migration)

These are smaller items inside the data-layers domain that we left after the main migration shipped. They retire specific casts / hand-written types
without standing up a new endpoint catalog entry.

1. **`SearchResults.data` is `unknown`** — backend currently emits `data: serializers.JSONField()`. Frontend casts the response to a hand-written
   `Pagination<SearchResult>` discriminated union (the largest remaining cast in `data-layers.state.service.ts`). Fix is a `PolymorphicProxySerializer`
   on the backend's `SearchResultsSerializer.data` keyed by `type` (`DATASET` → `DatasetSerializer`, `DATALAYER` → `BrowseDataLayerSerializer`). Once
   the schema declares the polymorphism, generated types replace `SearchResult` / `DataLayerSearchResult` / `DataSetSearchResult` and the cast goes
   away.
2. **`metadata` schema is still `OpenApiTypes.OBJECT`** — generated as `BrowseDataLayerMetadata = {[key: string]: unknown} | null`. The frontend casts
   to `Metadata = Record<string, any>` and uses bracket access. The fix is a real backend serializer for the heterogeneous shape (RRK ISO-19115
   sub-object + module configs), but it's deferred — moderate cost, modest payoff.
3. **`BaseLayer` cast at `base-layers-list.component.ts:132`** — `layers as unknown as BaseLayer[]`. Vector consumers want a narrower shape than the
   raster-typed `BrowseDataLayer.styles`. Bigger backend lift (polymorphic styles schema discriminated by layer type). Defer until vector usage
   actually causes pain.

### Suggested next moves (cost / payoff)

1. **(2)** Search PolymorphicProxySerializer — small, contained, retires the largest remaining cast in the data-layers module.
2. **Climate Foresight backend cleanup** — add `@extend_schema_field` annotations on the three `SerializerMethodField`s and `statistics`. Removes
   the "generated types lie" status without committing to a frontend service swap.
3. **Planning Areas migration** — blockers in this doc are all small and well-understood; mechanics now well-rehearsed. Highest endpoint payoff.
4. **Auth migration** — mostly mechanical 1:1 swap of `http.post`/`http.get` for `DjRestAuthService` methods; wrapper logic stays.
5. **Scenarios recon** — tag the viewset, regen, look at the generated type. 5-min experiment, no commitment.
