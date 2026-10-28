import { Inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  Observable,
  Subject,
  Subscription,
} from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import * as Sentry from '@sentry/angular';
import { environment } from '@env/environment';
import { WebSocketStatus, WorkspaceEvent } from '@types';
import { WINDOW } from './window.service';

// How long to wait before dialling again after the connection drops
export const RECONNECT_DELAY = 3000;

// The backoff never grows past this
export const MAX_RECONNECT_DELAY = 60000;

// Idle sockets get dropped on the way, so we keep them busy
export const HEARTBEAT_INTERVAL = 30000;

/**
 * Close codes the consumer uses to turn us away: unauthenticated, no longer a
 * member, or the workspace is gone. Dialling again would only repeat them.
 */
const FINAL_CLOSE_CODES = [4401, 4403, 4404];

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket$: WebSocketSubject<WorkspaceEvent> | null = null;
  private socketSubscription: Subscription | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  private workspaceId: number | null = null;

  private _status$ = new BehaviorSubject<WebSocketStatus>('disconnected');
  /** Connection state; replays the current value on subscribe. */
  status$ = this._status$.pipe(distinctUntilChanged());

  private _messages$ = new Subject<WorkspaceEvent>();
  /** Every event received from the backend. */
  messages$ = this._messages$.asObservable();

  constructor(@Inject(WINDOW) private window: Window & typeof globalThis) {}

  get status(): WebSocketStatus {
    return this._status$.value;
  }

  /**
   * Connects to the channel of a workspace. Connecting to the one we are
   * already on does nothing; connecting to another one moves the connection.
   * Does nothing while no endpoint is configured.
   */
  connect(workspaceId: number): void {
    if (!environment.websocket_endpoint) {
      return;
    }
    if (this.workspaceId === workspaceId && this.socket$) {
      return;
    }
    this.disconnect();
    this.workspaceId = workspaceId;
    this.open(workspaceId);
  }

  disconnect(): void {
    this.cancelReconnect();
    this.workspaceId = null;
    if (!this.socket$) {
      return;
    }
    // closes the socket, or aborts the handshake if it hasn't finished
    const socket$ = this.socket$;
    socket$.complete();
    this.cleanup(socket$, 'disconnected');
  }

  on<T = Record<string, unknown>>(type: string): Observable<WorkspaceEvent<T>> {
    return this.messages$.pipe(
      filter((event) => event.type === type)
    ) as Observable<WorkspaceEvent<T>>;
  }

  private open(workspaceId: number): void {
    this._status$.next('connecting');
    // captured so the callbacks of a closed socket can't touch a newer one
    const socket$: WebSocketSubject<WorkspaceEvent> = webSocket({
      url: this.urlFor(workspaceId),
      WebSocketCtor: this.window.WebSocket,
      openObserver: {
        next: () => {
          if (this.socket$ !== socket$) {
            return;
          }
          this.reconnectAttempts = 0;
          this.startHeartbeat(socket$);
          this._status$.next('connected');
        },
      },
      closeObserver: {
        next: (event) => {
          if (this.socket$ !== socket$) {
            return;
          }
          if (event.wasClean) {
            this.cleanup(socket$, 'disconnected');
            return;
          }
          this.logError(
            new Error(`WebSocket closed unexpectedly (code ${event.code})`)
          );
          this.cleanup(socket$, 'error');
          if (!FINAL_CLOSE_CODES.includes(event.code)) {
            this.scheduleReconnect(workspaceId);
          }
        },
      },
    });
    this.socket$ = socket$;
    this.socketSubscription = socket$.subscribe({
      next: (event) => this._messages$.next(event),
      error: (error) => {
        this.logError(error);
        this.cleanup(socket$, 'error');
        this.scheduleReconnect(workspaceId);
      },
    });
  }

  private scheduleReconnect(workspaceId: number): void {
    if (this.reconnectTimer || this.workspaceId !== workspaceId) {
      return;
    }
    const delay = Math.min(
      RECONNECT_DELAY * 2 ** this.reconnectAttempts,
      MAX_RECONNECT_DELAY
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.workspaceId === workspaceId && !this.socket$) {
        this.open(workspaceId);
      }
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  // Keeps the connection from being dropped for being idle
  private startHeartbeat(socket$: WebSocketSubject<WorkspaceEvent>): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (this.socket$ === socket$) {
        socket$.next({ type: 'ping' });
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private urlFor(workspaceId: number): string {
    return `${environment.websocket_endpoint}/workspaces/${workspaceId}/`;
  }

  private cleanup(
    socket$: WebSocketSubject<WorkspaceEvent>,
    status: WebSocketStatus
  ) {
    if (this.socket$ !== socket$) {
      return;
    }
    this.stopHeartbeat();
    this.socketSubscription?.unsubscribe();
    this.socketSubscription = null;
    this.socket$ = null;
    this._status$.next(status);
  }

  private logError(error: unknown) {
    Sentry.captureException(error);
  }
}
