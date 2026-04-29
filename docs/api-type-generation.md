# API Type Generation: drf-spectacular + orval

## Goal

Single source of truth for API types: backend declares the contract via OpenAPI schema, frontend consumes generated Angular services. No more duplicated interfaces.

**Stack**: `drf-spectacular` (backend schema) + `orval` (Angular `HttpClient` service generation).

## Current state

- `drf-spectacular` already installed and configured (`SPECTACULAR_SETTINGS` in `settings.py`)
- Schema endpoint: `GET /planscape-backend/v2/schema` (dev/staging only)
- Swagger UI: `GET /planscape-backend/v2/schema/swagger`
- Some views already use `@extend_schema` (e.g. `DatasetViewSet`, `ModuleViewSet`)
- Frontend: manual `HttpClient` services with hand-typed interfaces, CSRF + JWT interceptors in place

---

## POC first: vertical slice through `DatasetViewSet`

Before doing anything sequentially, validate the full loop end-to-end on one endpoint.

**Why this endpoint**: `DatasetViewSet` already has `@extend_schema` on the `browse` action, drf-spectacular infers the `list` action automatically, and `DataLayersService` (`src/interface/src/app/services/data-layers.service.ts`) is the existing counterpart to compare against.

### POC steps

1. **Verify the schema** — hit `/planscape-backend/v2/schema` locally, confirm `datasets` endpoints appear with correct types.

2. **Install orval** in the frontend:
   ```
   npm install -D orval
   ```

3. **Add `orval.config.ts`** at `src/interface/`:
   ```ts
   import { defineConfig } from 'orval';

   export default defineConfig({
     planscape: {
       input: 'http://localhost:8000/planscape-backend/v2/schema',
       output: {
         mode: 'tags-split',           // one file per OpenAPI tag
         target: 'src/app/api/generated',
         client: 'angular',            // generates @Injectable() HttpClient services
         httpClient: 'http-client',
         baseUrl: '/planscape-backend',
       },
     },
   });
   ```

4. **Add npm script** to `package.json`:
   ```json
   "generate:api": "orval --config orval.config.ts"
   ```

5. **Run generation**, inspect output in `src/app/api/generated/`.

6. **Wire one call** — replace `listDataSets()` in a component with the generated service, verify:
   - CSRF interceptor fires
   - JWT interceptor fires
   - Sentry logging interceptor fires
   - Response shape matches

7. **Assess** — does the generated service shape feel usable? What needs tweaking in orval config or backend annotations before scaling up?

---

## Sequential plan (post-POC)

### Phase 1 — Backend: harden the schema

- Audit `SPECTACULAR_SETTINGS`: add `SCHEMA_PATH_PREFIX` to strip the common URL prefix from generated paths if needed.
- Establish tag convention: use `@extend_schema(tags=['typed'])` as the "this endpoint is migrated" marker. Views not ready get `@extend_schema(exclude=True)` only if their inferred schema is actively wrong.
- Annotate remaining `DatasetViewSet` and `DataLayerViewSet` actions properly (return types, query params).
- Work outward to other viewsets as they're touched.

### Phase 2 — Frontend: configure orval properly

- Tune `orval.config.ts` based on POC learnings (path overrides, `withCredentials` default, tag filtering).
- Commit generated files to `src/app/api/generated/` — schema drift becomes visible in PR diffs.
- Add `generate:api` to CI: fail if committed generated files are stale relative to the schema.

### Phase 3 — Incremental migration

Rule: **touch an endpoint → migrate it**.

- New endpoint: annotate backend with `tags=['typed']` from day one, use generated service on FE.
- Existing endpoint: when you naturally visit it, add annotation, regenerate, swap the Angular service.
- Old manual services stay untouched until their endpoint is migrated — no big-bang required.

```
src/interface/src/app/
  api/
    generated/          ← committed, generated from schema
      datasets.service.ts
      ...
  services/             ← existing manual services, removed endpoint by endpoint
    data-layers.service.ts   (migrated → delete when done)
    scenario.service.ts      (not yet migrated)
    ...
```

### Phase 4 — CI guard

Once a critical mass of endpoints is covered, wire the schema check into CI:
```
npm run generate:api && git diff --exit-code src/app/api/generated/
```
This catches backend changes that break the FE contract before they merge.

---

## Known issues

### 1. `<DataLayer[]>` generic override (active lie — fix this before migrating more endpoints)

`datasetsBrowsePost` is called with a generic override:
```ts
this.datasetsService.datasetsBrowsePost<DataLayer[]>(...)
```
This silences the type checker but lies to it. The endpoint returns `BrowseDataLayer[]` (generated type), not `DataLayer[]` (hand-written type). TypeScript accepts it, but if the shapes diverge at runtime the error is silent.

Root cause: the `path` field. The hand-written `DataLayer.path` is `string[]` (correct — backend returns `Collection[str]`). The generated `BrowseDataLayer.path` is `string` because drf-spectacular misreads `SerializerMethodField` return type hints. Fix: add `@extend_schema_field(serializers.ListField(child=serializers.CharField()))` to the `get_path` method in `BrowseDataLayerSerializer`.

Once fixed, re-evaluate which fields still differ and whether to converge to the generated type or keep the hand-written one as a domain type.

### 2. Two type systems in parallel

Hand-written types (`src/app/types/data-sets.ts`: `DataLayer`, `DataSet`, `BaseDataSet`, `SearchResult`, `SearchQuery`, `BaseLayer`) are used app-wide. Generated types exist but we cast to the old ones. Until hand-written types are retired, both must be maintained. Each migrated endpoint should move its callers off the hand-written type.

### 3. `as ModuleEnum` boundary cast

`MAP_MODULE_NAME` injection token is typed `string` but always holds a valid `ModuleEnum` value. The cast in `data-layers.state.service.ts` is correct but fragile. Long-term fix: retype the token as `ModuleEnum`.

### 4. Unmigrated `DataLayersService` methods

`search`, `getPublicUrl`, `getDataLayerById`, `getDataLayersByIds`, `listBaseLayersByDataSet` still use hand-written `HttpClient` calls. Migrate as they are touched (Phase 3 rule).

### 5. `DataLayersStateService` spec missing mock

`DataLayersStateService` now injects `DatasetsService` but the spec only has `MockProvider(DataLayersService)`. Add `MockProvider(DatasetsService)` to the spec providers.

### 6. `v2/v2.service.ts` @ts-nocheck

Catch-all file for untagged endpoints. Suppression disappears naturally as endpoints gain tags and move to their own service files.

---

## Migration tracking

Use the `tags=['typed']` decorator as the canonical signal that a backend endpoint is ready.
Check coverage at any time via:
```
grep -r "tags=\['typed'\]" src/planscape/
```
