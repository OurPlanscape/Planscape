import { environment } from 'src/environments/environment';
// TODO remove this file.
export const BackendConstants = {
  END_POINT: environment.backend_endpoint,
  TILES_END_POINT: environment.tile_endpoint,
  DOWNLOAD_END_POINT: environment.download_endpoint,
} as const;
