# API Type Generation

Planscape uses [orval](https://orval.dev/) to generate TypeScript services and types from the OpenAPI schema
exposed by the Django backend (drf-spectacular).

## How it works

1. Django backend at `src/planscape/` exposes `/api/schema/` (OpenAPI 3.x via drf-spectacular)
2. `npm run generate:api` fetches the schema and runs orval
3. Generated output lands in `src/app/api/generated/` — one service file per OpenAPI tag (`tags-split` mode)
4. Untagged endpoints fall into `v2/v2.service.ts` (suppressed with `@ts-nocheck` until migrated)

## Adding a new endpoint to the generated types

On the backend:
- Add `@extend_schema(tags=["your-tag"], operation_id="your_operation_id", ...)` to the view
- For `SerializerMethodField` with non-obvious return types, add `@extend_schema_field(...)` to the method
- If a viewset has a `pagination_class` you need to conditionally disable, override it as a `@property`

Then run:
```
npm run generate:api
```

## Migration pattern

When migrating a hand-written service to the generated one:

1. Annotate the backend views with `@extend_schema`
2. Restart the backend (`docker compose restart web`)
3. Run `npm run generate:api`
4. Update the component to import from `@app/api/generated/...`
5. Delete the hand-written service, types, and spec files
6. Update `services/index.ts` and `types/index.ts` barrel exports

## Completed migrations

| Domain   | Hand-written (deleted)                         | Generated (now used)               |
|----------|------------------------------------------------|------------------------------------|
| Invites  | `services/invites.service.ts`, `types/invite.types.ts` | `api/generated/invites/invites.service.ts`, `planscapeAPI.schemas.ts` (`UserObjectRole`, `RoleEnum`) |

## Known issues

### 1. `DataLayersStateService`: adapter still needed for `browse` endpoint

`datasetsBrowsePost` returns `BrowseDataLayer[]` (generated), but the rest of the app uses the
hand-written `DataLayer` interface. The `toBrowseDataLayer()` adapter in
`data-layers/data-layers.state.service.ts` converts between them.

Several fields still need `@extend_schema_field` annotations on the backend before the casts
can be removed:
- `styles` — annotated as `string` in schema, actually `Styles[]`
- `info` — typed as `unknown`, actually `Info`
- `metadata` — typed as `unknown`, actually `Metadata`

### 2. Two type systems coexisting

Hand-written interfaces in `src/app/types/` and generated interfaces in `src/app/api/generated/`
are both in use. Progressively migrate by deleting hand-written types as each service is migrated.

### 3. `as ModuleEnum` boundary cast

`MAP_MODULE_NAME` injection token is typed as `string` in the codebase but should be `ModuleEnum`.
This forces a cast at the boundary.

### 4. Unmigrated `DataLayersService` methods

These methods in `data-layers.service.ts` still use hand-written HTTP calls:
- `search`
- `getPublicUrl`
- `getDataLayerById`
- `getDataLayersByIds`
- `listBaseLayersByDataSet`

### 5. `v2/v2.service.ts` suppressed with `@ts-nocheck`

Untagged backend endpoints land here. Suppress goes away naturally as more endpoints get
tagged in the backend.
