import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { WebSocketStatus, WorkspaceEvent } from '@types';
import { environment } from '@env/environment';
import {
  HEARTBEAT_INTERVAL,
  RECONNECT_DELAY,
  WebSocketService,
} from './websocket.service';
import { WINDOW } from './window.service';

/** Stand-in for the browser WebSocket; tests drive its events by hand. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readyState: number = WebSocket.CONNECTING;
  closed = false;
  sent: string[] = [];

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

  receive(event: WorkspaceEvent) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }

  dropped(code = 1006) {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ wasClean: false, code });
  }
}

const workspaceId = 7;

const planningAreaCreated: WorkspaceEvent = {
  type: 'planning.planning_area.created',
  workspace_id: workspaceId,
  object: { kind: 'planning_area', id: 3 },
  data: { map_status: 'PENDING' },
  actor_id: 12,
  timestamp: '2026-10-26T10:00:00Z',
};

describe('WebSocketService', () => {
  let service: WebSocketService;
  let logErrorSpy: jasmine.Spy;
  let endpoint: string;

  function socket(): FakeWebSocket {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  beforeEach(() => {
    FakeWebSocket.instances = [];
    endpoint = environment.websocket_endpoint;
    // the test environment ships without an endpoint
    environment.websocket_endpoint = '/planscape-backend/ws';
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

  afterEach(() => {
    service.disconnect();
    environment.websocket_endpoint = endpoint;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.status).toBe('disconnected');
  });

  describe('connect', () => {
    it('opens a socket to the channel of the workspace', () => {
      const statuses: WebSocketStatus[] = [];
      service.status$.subscribe((status) => statuses.push(status));

      service.connect(workspaceId);

      expect(FakeWebSocket.instances.length).toBe(1);
      expect(socket().url).toBe('/planscape-backend/ws/workspaces/7/');
      expect(service.status).toBe('connecting');

      socket().open();

      expect(service.status).toBe('connected');
      expect(statuses).toEqual(['disconnected', 'connecting', 'connected']);
    });

    it('stays on the socket it already has for that workspace', () => {
      service.connect(workspaceId);
      socket().open();

      service.connect(workspaceId);

      expect(FakeWebSocket.instances.length).toBe(1);
    });

    it('moves the connection when another workspace is opened', () => {
      service.connect(workspaceId);
      const first = socket();
      first.open();

      service.connect(9);

      expect(first.closed).toBeTrue();
      expect(FakeWebSocket.instances.length).toBe(2);
      expect(socket().url).toBe('/planscape-backend/ws/workspaces/9/');
    });

    it('does nothing when the endpoint is not configured', () => {
      environment.websocket_endpoint = '';

      service.connect(workspaceId);

      expect(FakeWebSocket.instances.length).toBe(0);
      expect(service.status).toBe('disconnected');
      expect(logErrorSpy).not.toHaveBeenCalled();
    });

    it('can connect again after disconnecting', () => {
      service.connect(workspaceId);
      service.disconnect();

      service.connect(workspaceId);
      socket().open();

      expect(FakeWebSocket.instances.length).toBe(2);
      expect(service.status).toBe('connected');
    });

    it('ignores the close of a previous socket', () => {
      service.connect(workspaceId);
      const first = socket();
      service.disconnect();
      service.connect(workspaceId);
      socket().open();

      first.dropped();

      expect(service.status).toBe('connected');
    });
  });

  describe('events', () => {
    beforeEach(() => {
      service.connect(workspaceId);
      socket().open();
    });

    it('emits every event received', () => {
      const received: WorkspaceEvent[] = [];
      service.messages$.subscribe((event) => received.push(event));

      socket().receive(planningAreaCreated);
      socket().receive({ type: 'pong' });

      expect(received).toEqual([planningAreaCreated, { type: 'pong' }]);
    });

    it('filters by type with on(), envelope and all', () => {
      const received: WorkspaceEvent[] = [];
      service
        .on('planning.planning_area.created')
        .subscribe((event) => received.push(event));

      socket().receive({ type: 'pong' });
      socket().receive(planningAreaCreated);

      expect(received).toEqual([planningAreaCreated]);
    });
  });

  describe('disconnect', () => {
    it('closes the socket and updates the status', () => {
      service.connect(workspaceId);
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

  describe('keepalive', () => {
    it('pings while the connection is open', fakeAsync(() => {
      service.connect(workspaceId);
      socket().open();

      tick(HEARTBEAT_INTERVAL);

      expect(socket().sent).toEqual([JSON.stringify({ type: 'ping' })]);

      // the heartbeat is periodic; close it inside the fake clock
      service.disconnect();
    }));

    it('stops pinging once the connection is gone', fakeAsync(() => {
      service.connect(workspaceId);
      socket().open();
      const open = socket();
      service.disconnect();

      tick(HEARTBEAT_INTERVAL * 2);

      expect(open.sent).toEqual([]);
    }));
  });

  describe('when the connection drops', () => {
    it('reports the error and dials again', fakeAsync(() => {
      service.connect(workspaceId);
      socket().open();

      socket().dropped();

      expect(service.status).toBe('error');
      expect(logErrorSpy).toHaveBeenCalled();

      tick(RECONNECT_DELAY);

      expect(FakeWebSocket.instances.length).toBe(2);
      socket().open();
      expect(service.status).toBe('connected');

      service.disconnect();
    }));

    it('keeps the events flowing after it dials again', fakeAsync(() => {
      const received: WorkspaceEvent[] = [];
      service.messages$.subscribe((event) => received.push(event));
      service.connect(workspaceId);
      socket().open();

      socket().dropped();
      tick(RECONNECT_DELAY);
      socket().open();
      socket().receive(planningAreaCreated);

      expect(received).toEqual([planningAreaCreated]);

      service.disconnect();
    }));

    it('backs off while the backend stays down', fakeAsync(() => {
      service.connect(workspaceId);
      socket().open();

      socket().dropped();
      tick(RECONNECT_DELAY);
      expect(FakeWebSocket.instances.length).toBe(2);

      // the second attempt never opens, so the wait doubles
      socket().dropped();
      tick(RECONNECT_DELAY);
      expect(FakeWebSocket.instances.length).toBe(2);

      tick(RECONNECT_DELAY);
      expect(FakeWebSocket.instances.length).toBe(3);
    }));

    it('waits the short delay again after a connection that worked', fakeAsync(() => {
      service.connect(workspaceId);
      socket().open();

      socket().dropped();
      tick(RECONNECT_DELAY);
      socket().open();

      socket().dropped();
      tick(RECONNECT_DELAY);

      expect(FakeWebSocket.instances.length).toBe(3);

      service.disconnect();
    }));

    it('gives up when the backend turns us away', fakeAsync(() => {
      service.connect(workspaceId);
      socket().open();

      // 4403: no longer a member, or the workspace is gone
      socket().dropped(4403);
      tick(RECONNECT_DELAY);

      expect(FakeWebSocket.instances.length).toBe(1);
      expect(service.status).toBe('error');
    }));

    it('does not dial again once we left the workspace', fakeAsync(() => {
      service.connect(workspaceId);
      socket().open();

      socket().dropped();
      service.disconnect();
      tick(RECONNECT_DELAY);

      expect(FakeWebSocket.instances.length).toBe(1);
    }));
  });
});
