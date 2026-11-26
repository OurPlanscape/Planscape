import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { AuthService, WebSocketService } from '@app/services';
import { WorkspaceDataLayersService } from '@services/workspace-data-layers.service';
import { FeatureService } from '@features/feature.service';
import { Pagination, WorkspaceDataLayer, WorkspaceEvent } from '@types';
import { UploadDataLayerComponent } from '@data-layers/upload-data-layer/upload-data-layer.component';
import { ActiveUploadsService } from '@data-layers/upload-data-layer/active-uploads.service';
import { WorkspaceState } from '../workspace.state';
import {
  DATA_LAYERS_PAGE_SIZE,
  formatFileSize,
  WorkspaceDataLayersComponent,
} from './workspace-data-layers.component';

@Component({ selector: 'app-nav-bar', standalone: true, template: '' })
class NavBarStubComponent {
  @Input() area = '';
}

function layer(
  id: number,
  overrides: Partial<WorkspaceDataLayer> = {}
): WorkspaceDataLayer {
  return {
    id,
    uuid: `uuid-${id}`,
    name: `Layer ${id}`,
    type: 'RASTER',
    status: 'READY',
    failure_reason: null,
    original_name: `layer_${id}.tif`,
    file_size: 2048,
    created_at: '2026-11-15T12:00:00Z',
    updated_at: '2026-11-15T12:00:00Z',
    created_by: 1,
    creator_name: 'Pablo Lopez',
    ...overrides,
  };
}

function page(
  layers: WorkspaceDataLayer[],
  count = layers.length
): Pagination<WorkspaceDataLayer> {
  return { count, results: layers };
}

describe('WorkspaceDataLayersComponent', () => {
  let fixture: ComponentFixture<WorkspaceDataLayersComponent>;
  let component: WorkspaceDataLayersComponent;
  let service: jasmine.SpyObj<WorkspaceDataLayersService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogResult$: Subject<unknown>;
  let updates$: Subject<WorkspaceEvent | null>;
  let workspace$: BehaviorSubject<any>;
  let uploadEnabled: boolean;

  beforeEach(async () => {
    uploadEnabled = true;
    service = jasmine.createSpyObj('WorkspaceDataLayersService', [
      'listDataLayers',
      'deleteDataLayer',
    ]);
    service.listDataLayers.and.returnValue(of(page([layer(1)])));
    service.deleteDataLayer.and.returnValue(of(undefined));
    dialogResult$ = new Subject();
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => dialogResult$ } as any);
    updates$ = new Subject();
    workspace$ = new BehaviorSubject({
      id: 7,
      name: 'North Fork',
      permissions: ['view_workspace', 'add_datalayer'],
    });

    await TestBed.configureTestingModule({
      imports: [WorkspaceDataLayersComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: WorkspaceDataLayersService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { workspaceId: 7 } } },
        },
        {
          provide: WorkspaceState,
          useValue: {
            currentWorkspace$: workspace$,
            isWorkspaceLoading$: of(false),
            workspaceNotFound$: of(false),
          },
        },
        {
          provide: WebSocketService,
          useValue: { workspaceUpdates$: () => updates$ },
        },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 1 }) } },
        {
          provide: FeatureService,
          useValue: { isFeatureEnabled: () => uploadEnabled },
        },
        {
          provide: BreadcrumbService,
          useValue: jasmine.createSpyObj('BreadcrumbService', [
            'updateBreadCrumb',
          ]),
        },
      ],
    })
      .overrideComponent(WorkspaceDataLayersComponent, {
        remove: { imports: [NavBarComponent] },
        add: { imports: [NavBarStubComponent] },
      })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();

    fixture = TestBed.createComponent(WorkspaceDataLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const rows = () =>
    Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<Element>
    );
  const text = () => fixture.nativeElement.textContent as string;

  it('lists the first page of the workspace data layers', () => {
    expect(service.listDataLayers).toHaveBeenCalledWith(
      7,
      DATA_LAYERS_PAGE_SIZE,
      0
    );
    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('Layer 1');
    expect(rows()[0].textContent).toContain('layer_1.tif');
    expect(rows()[0].textContent).toContain('Pablo Lopez');
    expect(rows()[0].textContent).toContain('2.0 KB');
  });

  it('points the breadcrumb back to the workspace', () => {
    expect(
      TestBed.inject(BreadcrumbService).updateBreadCrumb
    ).toHaveBeenCalledWith({ label: 'North Fork', backUrl: '/workspace/7' });
  });

  it('shows processing and failed layers with the failure reason', () => {
    service.listDataLayers.and.returnValue(
      of(
        page([
          layer(1, { status: 'PENDING', created_by: 2 }),
          layer(2, { status: 'PROCESSING' }),
          layer(3, {
            status: 'FAILED',
            failure_reason: 'The file has no coordinate reference system.',
          }),
        ])
      )
    );
    updates$.next(null);
    fixture.detectChanges();

    expect(rows()[0].textContent).toContain('Processing');
    expect(rows()[1].textContent).toContain('Processing');
    expect(rows()[2].textContent).toContain('Failed');
    expect(rows()[2].textContent).toContain(
      'The file has no coordinate reference system.'
    );
  });

  describe('your own pending upload', () => {
    beforeEach(() => {
      service.listDataLayers.and.returnValue(
        of(page([layer(1, { status: 'PENDING' })]))
      );
    });

    it('shows as processing while this tab sends it', () => {
      TestBed.inject(ActiveUploadsService).add(1);
      updates$.next(null);
      fixture.detectChanges();

      expect(rows()[0].textContent).toContain('Processing');
      expect(rows()[0].querySelector('td.actions button')).toBeNull();
      TestBed.inject(ActiveUploadsService).remove(1);
    });

    it('shows as interrupted and deletable once nothing sends it', () => {
      updates$.next(null);
      fixture.detectChanges();

      expect(rows()[0].textContent).toContain('Upload interrupted');
      expect(rows()[0].querySelector('td.actions button')).toBeTruthy();
    });
  });

  it('links only ready layers to their edit page', () => {
    service.listDataLayers.and.returnValue(
      of(page([layer(1), layer(2, { status: 'PROCESSING' })]))
    );
    updates$.next(null);
    fixture.detectChanges();

    const links = rows().map((row) => row.querySelector('a.layer-link'));
    expect(links[0]?.getAttribute('href')).toBe('/workspace/7/datalayers/1');
    expect(links[1]).toBeNull();
  });

  it('refreshes when an upload event arrives', () => {
    service.listDataLayers.calls.reset();
    service.listDataLayers.and.returnValue(of(page([layer(1), layer(2)])));

    updates$.next({ type: 'datasets.datalayer.status_changed' });
    fixture.detectChanges();

    expect(service.listDataLayers).toHaveBeenCalledTimes(1);
    expect(rows().length).toBe(2);
  });

  it('shows an empty state without layers', () => {
    service.listDataLayers.and.returnValue(of(page([])));
    updates$.next(null);
    fixture.detectChanges();

    expect(rows().length).toBe(0);
    expect(text()).toContain('No data layers yet');
  });

  it('offers a retry when the list fails to load', () => {
    service.listDataLayers.and.returnValue(throwError(() => new Error()));
    updates$.next(null);
    fixture.detectChanges();

    expect(text()).toContain("We couldn't load the data layers");

    service.listDataLayers.and.returnValue(of(page([layer(1)])));
    component.retry();
    fixture.detectChanges();

    expect(rows().length).toBe(1);
  });

  it('loads the requested page', () => {
    component.goToPage(3);

    expect(service.listDataLayers).toHaveBeenCalledWith(
      7,
      DATA_LAYERS_PAGE_SIZE,
      2 * DATA_LAYERS_PAGE_SIZE
    );
  });

  it('steps back a page when the current one empties', () => {
    component.goToPage(2);
    service.listDataLayers.and.returnValue(of(page([], DATA_LAYERS_PAGE_SIZE)));
    updates$.next(null);

    expect(component.page$.value).toBe(1);
  });

  describe('upload', () => {
    it('opens the upload dialog for the workspace', () => {
      component.upload();

      expect(dialog.open).toHaveBeenCalledWith(UploadDataLayerComponent, {
        data: { workspaceId: 7 },
      });
    });

    it('reloads from the first page after an upload', () => {
      component.goToPage(2);
      service.listDataLayers.calls.reset();
      component.upload();
      dialogResult$.next(layer(9));

      expect(component.page$.value).toBe(1);
      expect(service.listDataLayers).toHaveBeenCalledWith(
        7,
        DATA_LAYERS_PAGE_SIZE,
        0
      );
    });
  });

  describe('delete', () => {
    const deleteButtons = () =>
      fixture.nativeElement.querySelectorAll('td.actions button');

    it('only offers delete on failed layers', () => {
      service.listDataLayers.and.returnValue(
        of(
          page([
            layer(1),
            layer(2, { status: 'PROCESSING' }),
            layer(3, { status: 'FAILED' }),
          ])
        )
      );
      updates$.next(null);
      fixture.detectChanges();

      expect(deleteButtons().length).toBe(1);
      expect(rows()[2].querySelector('td.actions button')).toBeTruthy();
    });

    it('deletes after confirmation and reloads', () => {
      service.listDataLayers.calls.reset();
      component.delete(layer(1));
      dialogResult$.next(true);

      expect(service.deleteDataLayer).toHaveBeenCalledWith(7, 1);
      expect(service.listDataLayers).toHaveBeenCalled();
    });

    it('does nothing when cancelled', () => {
      component.delete(layer(1));
      dialogResult$.next(false);

      expect(service.deleteDataLayer).not.toHaveBeenCalled();
    });

    it('escapes the layer name in the confirmation', () => {
      component.delete(layer(1, { name: '<img src=x>' }));

      const body = (dialog.open.calls.mostRecent().args[1] as any).data.body;
      expect(body).toContain('&lt;img src=x&gt;');
    });

    it('reports a failed delete', () => {
      const snackBar = spyOn(
        fixture.debugElement.injector.get(MatSnackBar),
        'open'
      );
      service.deleteDataLayer.and.returnValue(throwError(() => new Error()));
      component.delete(layer(1));
      dialogResult$.next(true);

      expect(snackBar).toHaveBeenCalled();
    });
  });

  describe('without permission', () => {
    it('hides the page from viewers', () => {
      workspace$.next({ id: 7, name: 'North Fork', permissions: ['view'] });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('main')).toBeNull();
      expect(text()).toContain('not found');
    });

    it('hides the page without DATA_UPLOAD', () => {
      uploadEnabled = false;
      workspace$.next(workspace$.value);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('main')).toBeNull();
    });
  });

  describe('formatFileSize', () => {
    it('picks a readable unit', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(5 * 1024 ** 3)).toBe('5.0 GB');
      expect(formatFileSize(null)).toBe('—');
    });
  });
});
