import { APIRequestContext } from '@playwright/test';
import { Geometry } from 'geojson';

interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function registerTestUser(api: APIRequestContext, user: TestUser) {
  return api.post('/planscape-backend/dj-rest-auth/registration/', {
    data: {
      email: user.email,
      password1: user.password,
      password2: user.password,
      first_name: user.firstName,
      last_name: user.lastName,
    },
  });
}

export async function loginTestUser(
  api: APIRequestContext,
  user: Pick<TestUser, 'email' | 'password'>
) {
  const res = await api.post('/planscape-backend/dj-rest-auth/login/', {
    data: {
      email: user.email,
      password: user.password,
    },
  });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
  return res;
}

/**
 * Planning areas and the map viewer live inside a workspace, so authenticated
 * specs need one before they can reach either.
 */
export async function createWorkspace(api: APIRequestContext, name: string) {
  const res = await api.post('/planscape-backend/v2/workspaces/', {
    data: { name },
  });
  if (!res.ok()) {
    throw new Error(
      `Creating workspace failed: ${res.status()} ${await res.text()}`
    );
  }
  return (await res.json()) as { id: number; name: string };
}

/** Deleting the workspace removes the planning areas created inside it. */
export async function deleteWorkspace(api: APIRequestContext, id: number) {
  const res = await api.delete(`/planscape-backend/v2/workspaces/${id}/`);
  if (!res.ok()) {
    throw new Error(
      `Deleting workspace failed: ${res.status()} ${await res.text()}`
    );
  }
}

export async function destroyTestUser(api: APIRequestContext) {
  const res = await api.post('/planscape-backend/users/e2e/destroy/');
  if (!res.ok()) {
    throw new Error(`Destroy failed: ${res.status()} ${await res.text()}`);
  }
  return res;
}

const PLANNING_AREA_URL = 'planscape-backend/v2/planningareas/'


export async function createPlanningArea(api: APIRequestContext, testName: string, testGeom: Geometry) {
  const res = await api.post(PLANNING_AREA_URL, {
    data: { name: testName, geometry: testGeom } // Unique name using timestamp
  });
  if (!res.ok()) {
    throw new Error(`Plan creation failed: ${res.status()} ${await res.text()}`);
  }
  return res;
}

export async function deletePlanningArea(api: APIRequestContext, planId: number) {
  const res = await api.delete(PLANNING_AREA_URL + '/' + planId, {
  });
  if (!res.ok()) {
    throw new Error(`Plan deletion failed: ${res.status()} ${await res.text()}`);
  }
  console.log('Deleted a plan:', res);
  return res;
}