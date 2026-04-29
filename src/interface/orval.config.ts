import { defineConfig } from 'orval';

export default defineConfig({
  planscape: {
    input: {
      target: 'http://localhost:8000/planscape-backend/v2/schema',
    },
    output: {
      mode: 'tags-split',
      target: 'src/app/api/generated',
      client: 'angular',
      override: {
        requestOptions: {
          withCredentials: true,
        },
      },
    },
  },
});
