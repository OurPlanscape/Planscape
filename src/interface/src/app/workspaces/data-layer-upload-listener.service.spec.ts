import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { MockProvider } from 'ng-mocks';
import { AuthService, WebSocketService } from '@services';
import {
  DATALAYER_STATUS_EVENT,
  DataLayerUploadPayload,
  WorkspaceEvent,
} from '@types';
import { DataLayerUploadListenerService } from './data-layer-upload-listener.service';
import { DataLayerReadyNoticeComponent } from './data-layer-ready-notice/data-layer-ready-notice.component';

describe('DataLayerUploadListenerService', () => {
  let events$: Subject<WorkspaceEvent>;
  let snackOpen: jasmine.Spy;
  let snackOpenFromComponent: jasmine.Spy;
  let snackAction$: Subject<void>;

  const statusChanged = (data: Partial<DataLayerUploadPayload>) =>
    ({
      type: DATALAYER_STATUS_EVENT,
      workspace_id: 2,
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
        MockProvider(Router),
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
    snackAction$ = new Subject<void>();
    const snackBarRef = { onAction: () => snackAction$ } as any;
    snackOpen = spyOn(TestBed.inject(MatSnackBar), 'open').and.returnValue(
      snackBarRef
    );
    snackOpenFromComponent = spyOn(
      TestBed.inject(MatSnackBar),
      'openFromComponent'
    ).and.returnValue(snackBarRef);
    TestBed.inject(DataLayerUploadListenerService).start();
  });

  it('tells the uploader their layer is ready', () => {
    events$.next(statusChanged({ status: 'READY' }));

    expect(snackOpenFromComponent).toHaveBeenCalledWith(
      DataLayerReadyNoticeComponent,
      jasmine.objectContaining({ data: { name: 'Canopy', canEdit: true } })
    );
  });

  it('opens the layer from the ready message', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    events$.next(statusChanged({ status: 'READY' }));
    snackAction$.next();

    expect(navigate).toHaveBeenCalledWith(['/workspace', 2, 'datalayers', 5]);
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

    expect(snackOpenFromComponent).not.toHaveBeenCalled();
  });

  it("stays quiet about someone else's upload", () => {
    events$.next(statusChanged({ created_by: 9 }));

    expect(snackOpenFromComponent).not.toHaveBeenCalled();
  });
});
