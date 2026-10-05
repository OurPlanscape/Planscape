export type WebSocketStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * Envelope for the messages exchanged with the backend over the WebSocket.
 * The backend contract is not defined yet: once it is, narrow `type` to the
 * known event names and `payload` to their shapes.
 */
export interface WebSocketMessage<T = unknown> {
  type: string;
  payload?: T;
}

// TODO: confirm the event name and payload with the backend.
/** Sent to the members of a workspace when its creator deletes it. */
export const WORKSPACE_DELETED_EVENT = 'workspace.deleted';

export interface WorkspaceDeletedPayload {
  workspace_id: number;
}
