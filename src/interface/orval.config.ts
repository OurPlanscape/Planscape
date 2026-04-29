import { defineConfig } from 'orval';

export default defineConfig({
  planscape: {
    input: {
      target: './api-schema.yaml',
    },
    output: {
      mode: 'tags-split',
      target: 'src/generated/api',
      client: 'angular',
      // Run prettier on each generated file as it's written so the output
      // matches the project's `.prettierrc` (single quotes, trailing commas,
      // etc.) rather than orval's defaults.
      prettier: true,
      override: {
        requestOptions: {
          withCredentials: true,
        },
        operationName: (operation, route, verb) => {
          const opId = operation.operationId ?? '';
          // drf-spectacular emits snake_case operationIds prefixed with the
          // URL segment (e.g. `v2_datalayers_list`). Strip the leading "v2_"
          // and camelCase the rest so call sites read `datalayersList` rather
          // than `v2DatalayersList`.
          const stripped = opId.replace(/^v2_/, '');
          return stripped.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
        },
      },
    },
    hooks: {
      // After orval finishes, run eslint --fix over the generated tree to
      // resolve anything prettier alone can't (e.g. import ordering, unused
      // imports flagged by the @typescript-eslint plugin).
      afterAllFilesWrite: 'eslint --fix src/generated/api',
    },
  },
});
