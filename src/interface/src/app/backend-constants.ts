import { environment  } from "src/environments/environment";

export const BackendConstants = {
  END_POINT: environment.backend_endpoint,
  TILES_END_POINT: 'https://planscape-tiles.s3.us-west-1.amazonaws.com/'
} as const;
