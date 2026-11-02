export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface WorkspaceEventObject {
  kind: string;
  id: number;
  [key: string]: unknown;
}

export interface WorkspaceEvent<T = Record<string, unknown>> {
  type: string;
  workspace_id?: number;
  object?: WorkspaceEventObject;
  data?: T;
  // Who caused it or null when a background task did
  actor_id?: number | null;
  timestamp?: string;
}

export const REALTIME_CONNECTED_EVENT = 'realtime.connected';

// The planning areas of the workspace changed
export const PLANNING_AREA_CREATED_EVENT = 'planning.planning_area.created';
export const PLANNING_AREA_UPDATED_EVENT = 'planning.planning_area.updated';
export const PLANNING_AREA_DELETED_EVENT = 'planning.planning_area.deleted';
export const PLANNING_AREA_MAP_STATUS_EVENT =
  'planning.planning_area.map_status_changed';

// A data layer joined or left the favorites, which the workspace shares
export const DATALAYER_FAVORITED_EVENT = 'datasets.datalayer.favorited';
export const DATALAYER_UNFAVORITED_EVENT = 'datasets.datalayer.unfavorited';

// Everything that changes what the list of planning areas shows
export const PLANNING_AREA_LIST_EVENTS = [
  PLANNING_AREA_CREATED_EVENT,
  PLANNING_AREA_UPDATED_EVENT,
  PLANNING_AREA_DELETED_EVENT,
  PLANNING_AREA_MAP_STATUS_EVENT,
];

// These carry the planning area as the API returns it, minus the geometry
export const PLANNING_AREA_DATA_EVENTS = [
  PLANNING_AREA_UPDATED_EVENT,
  PLANNING_AREA_MAP_STATUS_EVENT,
];

// Everything that changes what the list of scenarios of a plan shows
export const SCENARIO_LIST_EVENTS = [
  'planning.scenario.created',
  'planning.scenario.updated',
  'planning.scenario.deleted',
  'planning.scenario.status_changed',
];

export const MEMBER_ROLE_CHANGED_EVENT = 'workspace.member.role_changed';

// Data of workspace.member.role_changed
export interface MemberRoleChangedPayload {
  user_id: number;
  role: string;
}

// The workspace itself is gone the backend closes the socket right after
export const WORKSPACE_DELETED_EVENT = 'workspace.workspace.deleted';

// Data of workspace.workspace.deleted
export interface WorkspaceDeletedPayload {
  workspace_id: number;
}
