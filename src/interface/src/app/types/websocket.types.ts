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
