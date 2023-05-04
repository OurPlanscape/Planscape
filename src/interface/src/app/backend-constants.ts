import { environment  } from "src/environments/environment";

export const BackendConstants = {
  END_POINT: environment.backend_endpoint,
  TILES_END_POINT: 'https://dev-geo.planscape.org/geoserver/sierra-nevada/wms?', //TODO Make url managed by environment
} as const;
 