import { TestBed } from '@angular/core/testing';
import { WebSocketMessage, WebSocketStatus } from '@types';
import { WebSocketService } from './websocket.service';
import { WINDOW } from './window.service';

/** Stand-in for the browser WebSocket; tests drive its events by hand. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readyState: number = WebSocket.CONNECTING;
  sent: string[] = [];
  closed = false;

  onopen: ((event: unknown) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
  }

  // helpers to simulate the server side
  open() {
    this.readyState = WebSocket.OPEN;
    this.onopen?.({});
  }

  receive(message: WebSocketMessage) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  fail() {
    this.onerror?.({ type: 'error' });
  }

  dropped() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ wasClean: false, code: 1006 });
  }
}

describe('WebSocketService', () => {
  let service: WebSocketService;
  let logErrorSpy: jasmine.Spy;

  const url = 'wss://example.test/events';

  function socket(): FakeWebSocket {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  beforeEach(() => {
    FakeWebSocket.instances = [];
    // spy on our own method, not on Sentry
    logErrorSpy = spyOn(WebSocketService.prototype as any, 'logError' as any);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: WINDOW,
          useValue: { WebSocket: FakeWebSocket },
        },
      ],
    });
    service = TestBed.inject(WebSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.status).toBe('disconnected');
  });

  describe('connect', () => {
    it('opens a socket to the url and tracks the status', () => {
      const statuses: WebSocketStatus[] = [];
      service.status$.subscribe((status) => statuses.push(status));

      service.connect(url);

      expect(FakeWebSocket.instances.length).toBe(1);
      expect(socket().url).toBe(url);
      expect(service.status).toBe('connecting');

      socket().open();

      expect(service.status).toBe('connected');
      expect(statuses).toEqual(['disconnected', 'connecting', 'connected']);
    });

    it('does not open a second socket while one is open', () => {
      service.connect(url);
      socket().open();

      service.connect(url);

      expect(FakeWebSocket.instances.length).toBe(1);
    });

    it('does nothing when the endpoint is not configured', () => {
      service.connect('');

      expect(FakeWebSocket.instances.length).toBe(0);
      expect(service.status).toBe('disconnected');
      expect(logErrorSpy).not.toHaveBeenCalled();
    });

    it('can reconnect after disconnecting', () => {
      service.connect(url);
      service.disconnect();

      service.connect(url);
      socket().open();

      expect(FakeWebSocket.instances.length).toBe(2);
      expect(service.status).toBe('connected');
    });

    it('ignores the close of a previous socket', () => {
      service.connect(url);
      const first = socket();
      service.disconnect();
      service.connect(url);
      socket().open();

      first.dropped();

      expect(service.status).toBe('connected');
    });
  });

  describe('messages', () => {
    beforeEach(() => {
      service.connect(url);
      socket().open();
    });

    it('emits every message received', () => {
      const received: WebSocketMessage[] = [];
      service.messages$.subscribe((message) => received.push(message));

      socket().receive({ type: 'scenario.updated', payload: { id: 1 } });
      socket().receive({ type: 'ping' });

      expect(received).toEqual([
        { type: 'scenario.updated', payload: { id: 1 } },
        { type: 'ping' },
      ]);
    });

    it('filters by type and unwraps the payload with on()', () => {
      const payloads: unknown[] = [];
      service
        .on('scenario.updated')
        .subscribe((payload) => payloads.push(payload));

      socket().receive({ type: 'ping' });
      socket().receive({ type: 'scenario.updated', payload: { id: 1 } });

      expect(payloads).toEqual([{ id: 1 }]);
    });
  });

  describe('send', () => {
    it('serializes the message when connected', () => {
      service.connect(url);
      socket().open();

      service.send({ type: 'subscribe', payload: { plan: 5 } });

      expect(socket().sent).toEqual([
        JSON.stringify({ type: 'subscribe', payload: { plan: 5 } }),
      ]);
    });

    it('drops the message and logs when not connected', () => {
      service.send({ type: 'subscribe' });

      expect(FakeWebSocket.instances.length).toBe(0);
      expect(logErrorSpy).toHaveBeenCalled();
    });

    it('drops the message and logs while connecting', () => {
      service.connect(url);

      service.send({ type: 'subscribe' });

      expect(socket().sent).toEqual([]);
      expect(logErrorSpy).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('closes the socket and updates the status', () => {
      service.connect(url);
      socket().open();

      service.disconnect();

      expect(socket().closed).toBeTrue();
      expect(service.status).toBe('disconnected');
    });

    it('does nothing when not connected', () => {
      service.disconnect();

      expect(service.status).toBe('disconnected');
      expect(logErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('failures', () => {
    it('reports an error status and logs when the socket fails', () => {
      service.connect(url);

      socket().fail();

      expect(service.status).toBe('error');
      expect(logErrorSpy).toHaveBeenCalled();
    });

    it('reports an error status and logs when the connection is dropped', () => {
      service.connect(url);
      socket().open();

      socket().dropped();

      expect(service.status).toBe('error');
      expect(logErrorSpy).toHaveBeenCalled();
    });
  });
});
