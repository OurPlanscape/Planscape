import { environment  } from "src/environments/environment";

export const BackendConstants = {
  END_POINT: environment.backend_endpoint
} as const;
