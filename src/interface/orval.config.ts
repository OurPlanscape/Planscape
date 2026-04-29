import { defineConfig } from 'orval';

export default defineConfig({
  planscape: {
    input: {
      target: './api-schema.yaml',
    },
    output: {
      mode: 'tags-split',
      target: 'src/app/api/generated',
      client: 'angular',
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
  },
});
