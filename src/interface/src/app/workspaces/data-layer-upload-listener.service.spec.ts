import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, Subject } from 'rxjs';
import { MockProvider } from 'ng-mocks';
import { AuthService, WebSocketService } from '@services';
import {
  DATALAYER_STATUS_EVENT,
  DataLayerUploadPayload,
  WorkspaceEvent,
} from '@types';
import { DataLayerUploadListenerService } from './data-layer-upload-listener.service';

describe('DataLayerUploadListenerService', () => {
  let events$: Subject<WorkspaceEvent>;
  let snackOpen: jasmine.Spy;

  const statusChanged = (data: Partial<DataLayerUploadPayload>) =>
    ({
      type: DATALAYER_STATUS_EVENT,
      object: { kind: 'datalayer', id: 5 },
      data: {
        name: 'Canopy',
        status: 'READY',
        failure_reason: null,
        created_by: 3,
        ...data,
      },
      actor_id: null,
    }) as WorkspaceEvent;

  beforeEach(() => {
    events$ = new Subject<WorkspaceEvent>();

    TestBed.configureTestingModule({
      providers: [
        MockProvider(MatSnackBar),
        MockProvider(AuthService),
        {
          provide: WebSocketService,
          useValue: {
            on: (type: string) =>
              events$.pipe(filter((event) => event.type === type)),
          },
        },
      ],
    });

    spyOn(TestBed.inject(AuthService), 'currentUser').and.returnValue({
      id: 3,
    } as any);
    snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open');
    TestBed.inject(DataLayerUploadListenerService).start();
  });

  it('tells the uploader their layer is ready', () => {
    events$.next(statusChanged({ status: 'READY' }));

    expect(snackOpen).toHaveBeenCalledWith(
      jasmine.stringContaining('"Canopy" is ready'),
      'Dismiss',
      jasmine.anything()
    );
  });

  it('tells the uploader why their layer failed', () => {
    events$.next(
      statusChanged({
        status: 'FAILED',
        failure_reason: 'The raster has no CRS.',
      })
    );

    expect(snackOpen).toHaveBeenCalledWith(
      '[Error] "Canopy" couldn\'t be processed. The raster has no CRS.',
      'Dismiss',
      jasmine.anything()
    );
  });

  it('stays quiet while the layer is processing', () => {
    events$.next(statusChanged({ status: 'PROCESSING' }));

    expect(snackOpen).not.toHaveBeenCalled();
  });

  it("stays quiet about someone else's upload", () => {
    events$.next(statusChanged({ created_by: 9 }));

    expect(snackOpen).not.toHaveBeenCalled();
  });
});
