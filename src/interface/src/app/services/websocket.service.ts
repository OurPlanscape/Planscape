import { Inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  Subject,
  Subscription,
} from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import * as Sentry from '@sentry/angular';
import { environment } from '@env/environment';
import { WebSocketMessage, WebSocketStatus } from '@types';
import { WINDOW } from './window.service';

/**
 * Single WebSocket connection to the backend.
 *
 * The endpoint and the message contract are not defined yet. Once they are,
 * set `environment.websocket_endpoint` and extend `WebSocketMessage`; consumers
 * read events through `messages$` / `on()` and never touch the socket itself.
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket$: WebSocketSubject<WebSocketMessage> | null = null;
  private socketSubscription: Subscription | null = null;

  private _status$ = new BehaviorSubject<WebSocketStatus>('disconnected');
  /** Connection state; replays the current value on subscribe. */
  status$ = this._status$.pipe(distinctUntilChanged());

  private _messages$ = new Subject<WebSocketMessage>();
  /** Every message received from the backend. */
  messages$ = this._messages$.asObservable();

  constructor(@Inject(WINDOW) private window: Window & typeof globalThis) {}

  get status(): WebSocketStatus {
    return this._status$.value;
  }

  /**
   * Opens the connection. Does nothing if one is already open or opening.
   */
  connect(url = environment.websocket_endpoint): void {
    if (this.socket$) {
      return;
    }
    if (!url) {
      this.logError(new Error('WebSocket endpoint is not configured'));
      return;
    }

    this._status$.next('connecting');
    // captured so the callbacks of a closed socket can't touch a newer one
    const socket$: WebSocketSubject<WebSocketMessage> = webSocket({
      url,
      WebSocketCtor: this.window.WebSocket,
      openObserver: {
        next: () => {
          if (this.socket$ === socket$) {
            this._status$.next('connected');
          }
        },
      },
      closeObserver: {
        next: (event) => {
          if (this.socket$ !== socket$) {
            return;
          }
          if (!event.wasClean) {
            this.logError(
              new Error(`WebSocket closed unexpectedly (code ${event.code})`)
            );
          }
          this.cleanup(socket$, event.wasClean ? 'disconnected' : 'error');
        },
      },
    });
    this.socket$ = socket$;
    this.socketSubscription = socket$.subscribe({
      next: (message) => this._messages$.next(message),
      error: (error) => {
        this.logError(error);
        this.cleanup(socket$, 'error');
      },
    });
  }

  disconnect(): void {
    if (!this.socket$) {
      return;
    }
    // closes the socket, or aborts the handshake if it hasn't finished
    this.socket$.complete();
    this.cleanup(this.socket$, 'disconnected');
  }

  /** Messages are dropped, not queued, while the connection isn't open. */
  send(message: WebSocketMessage): void {
    if (!this.socket$ || this.status !== 'connected') {
      this.logError(
        new Error(
          `WebSocket message "${message.type}" sent while ${this.status}`
        )
      );
      return;
    }
    this.socket$.next(message);
  }

  /** Payloads of the messages of a given type. */
  on<T>(type: string): Observable<T> {
    return this.messages$.pipe(
      filter((message) => message.type === type),
      map((message) => message.payload as T)
    );
  }

  private cleanup(
    socket$: WebSocketSubject<WebSocketMessage>,
    status: WebSocketStatus
  ) {
    if (this.socket$ !== socket$) {
      return;
    }
    this.socketSubscription?.unsubscribe();
    this.socketSubscription = null;
    this.socket$ = null;
    this._status$.next(status);
  }

  private logError(error: unknown) {
    Sentry.captureException(error);
  }
}
