import { Component, Input } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ControlComponent,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { MockComponents } from 'ng-mocks';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { AuthService, DataLayersService } from '@services';
import { WorkspaceDataLayersService } from '@services/workspace-data-layers.service';
import { FeatureService } from '@features/feature.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MapConfigService } from '@maplibre-map/map-config.service';
import { MapDataLayerComponent } from '@maplibre-map/map-data-layer/map-data-layer.component';
import { MapLayerColorLegendComponent } from '@maplibre-map/map-layer-color-legend/map-layer-color-legend.component';
import { DataLayer, StyleJson, WorkspaceDataLayerDetail } from '@types';
import { WorkspaceState } from '../workspace.state';
import { WorkspaceDataLayerEditComponent } from './workspace-data-layer-edit.component';

@Component({ selector: 'app-nav-bar', standalone: true, template: '' })
class NavBarStubComponent {
  @Input() area = '';
}

const AUTOMATIC: StyleJson = {
  map_type: 'RAMP',
  no_data: { values: ['nan'], opacity: 0, label: '' },
  entries: [
    { value: 0, color: '#7a0403', opacity: 1, label: '0.0' },
    { value: 50, color: '#30123b', opacity: 1, label: '50.0' },
  ],
};

const CUSTOM: StyleJson = {
  ...AUTOMATIC,
  entries: [
    { value: 0, color: '#ffffff', opacity: 1, label: 'Low' },
    { value: 50, color: '#000000', opacity: 1, label: 'High' },
  ],
};

function detail(
  overrides: Partial<WorkspaceDataLayerDetail> = {}
): WorkspaceDataLayerDetail {
  return {
    id: 5,
    uuid: 'uuid-5',
    name: 'Canopy',
    type: 'RASTER',
    status: 'READY',
    failure_reason: null,
    original_name: 'canopy.tif',
    file_size: 1024,
    created_at: '2026-11-15T12:00:00Z',
    updated_at: '2026-11-15T12:00:00Z',
    created_by: 1,
    creator_name: 'Pablo Lopez',
    description: 'Old description',
    units: '',
    vintage: '2023',
    geographic_coverage: '',
    source_url: '',
    bbox: [-121, 38, -120, 39],
    custom_style: false,
    style: AUTOMATIC,
    default_style: AUTOMATIC,
    ...overrides,
  };
}

describe('WorkspaceDataLayerEditComponent', () => {
  let fixture: ComponentFixture<WorkspaceDataLayerEditComponent>;
  let component: WorkspaceDataLayerEditComponent;
  let service: jasmine.SpyObj<WorkspaceDataLayersService>;
  let dataLayersState: jasmine.SpyObj<DataLayersStateService>;
  let dataLayersService: jasmine.SpyObj<DataLayersService>;
  let updated$: Subject<WorkspaceDataLayerDetail>;
  let workspace$: BehaviorSubject<any>;
  const layer = {
    id: 5,
    name: 'Canopy',
    info: { stats: [{ min: 0, max: 50 }] },
  } as unknown as DataLayer;

  beforeEach(async () => {
    updated$ = new Subject();
    service = jasmine.createSpyObj('WorkspaceDataLayersService', [
      'getDataLayer',
      'updateDataLayer',
    ]);
    service.getDataLayer.and.returnValue(of(detail()));
    service.updateDataLayer.and.returnValue(updated$);
    dataLayersService = jasmine.createSpyObj('DataLayersService', [
      'getDataLayerById',
    ]);
    dataLayersService.getDataLayerById.and.returnValue(of(layer));
    dataLayersState = jasmine.createSpyObj('DataLayersStateService', [
      'selectDataLayer',
      'previewStyle',
    ]);
    workspace$ = new BehaviorSubject({
      id: 7,
      name: 'North Fork',
      permissions: ['add_datalayer'],
    });

    await TestBed.configureTestingModule({
      imports: [WorkspaceDataLayerEditComponent, NoopAnimationsModule],
      providers: [
        { provide: WorkspaceDataLayersService, useValue: service },
        { provide: DataLayersService, useValue: dataLayersService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { workspaceId: 7 },
              paramMap: convertToParamMap({ dataLayerId: '5' }),
            },
          },
        },
        {
          provide: WorkspaceState,
          useValue: {
            currentWorkspace$: workspace$,
            isWorkspaceLoading$: of(false),
            workspaceNotFound$: of(false),
          },
        },
        { provide: FeatureService, useValue: { isFeatureEnabled: () => true } },
        { provide: AuthService, useValue: { getAuthCookie: () => '' } },
        {
          provide: BreadcrumbService,
          useValue: jasmine.createSpyObj('BreadcrumbService', [
            'updateBreadCrumb',
          ]),
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate']),
        },
      ],
    })
      .overrideComponent(WorkspaceDataLayerEditComponent, {
        remove: {
          imports: [
            NavBarComponent,
            MapComponent,
            LayerComponent,
            ControlComponent,
            MapDataLayerComponent,
            MapLayerColorLegendComponent,
          ],
          providers: [DataLayersStateService, MapConfigService],
        },
        add: {
          imports: [
            NavBarStubComponent,
            ...MockComponents(
              MapComponent,
              LayerComponent,
              ControlComponent,
              MapLayerColorLegendComponent
            ),
          ],
          providers: [
            { provide: DataLayersStateService, useValue: dataLayersState },
            { provide: MapConfigService, useValue: { initialize: () => {} } },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(WorkspaceDataLayerEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const text = () => fixture.nativeElement.textContent as string;

  it('loads the layer into the form', () => {
    expect(service.getDataLayer).toHaveBeenCalledWith(7, 5);
    expect(component.form.getRawValue()).toEqual({
      name: 'Canopy',
      description: 'Old description',
      units: '',
      vintage: '2023',
      geographic_coverage: '',
      source_url: '',
    });
    expect(component.form.pristine).toBeTrue();
  });

  it('previews the layer on the map', () => {
    expect(dataLayersService.getDataLayerById).toHaveBeenCalledWith(5);
    expect(dataLayersState.selectDataLayer).toHaveBeenCalledWith(layer);
    expect(fixture.nativeElement.querySelector('mgl-map')).toBeTruthy();
  });

  it('points the breadcrumb back to the list', () => {
    expect(
      TestBed.inject(BreadcrumbService).updateBreadCrumb
    ).toHaveBeenCalledWith({
      label: 'Data Layers',
      backUrl: '/workspace/7/datalayers',
    });
  });

  it('saves only the fields that changed, trimmed', () => {
    component.form.patchValue({ units: ' Percent ', vintage: '2023' });
    component.form.markAsDirty();
    component.save();

    expect(service.updateDataLayer).toHaveBeenCalledWith(7, 5, {
      units: 'Percent',
    });
  });

  it('refreshes the form and preview after saving', () => {
    const snackBar = spyOn(
      fixture.debugElement.injector.get(MatSnackBar),
      'open'
    );
    component.form.patchValue({ units: 'Percent' });
    component.form.markAsDirty();
    component.save();
    dataLayersState.selectDataLayer.calls.reset();

    updated$.next(detail({ units: 'Percent' }));

    expect(component.saving).toBeFalse();
    expect(component.form.pristine).toBeTrue();
    expect(component.form.controls.units.value).toBe('Percent');
    expect(dataLayersState.selectDataLayer).toHaveBeenCalled();
    expect(snackBar).toHaveBeenCalled();
  });

  it('does not call the API when nothing changed', () => {
    component.form.markAsDirty();
    component.save();

    expect(service.updateDataLayer).not.toHaveBeenCalled();
    expect(component.form.pristine).toBeTrue();
  });

  it('shows the field error from the API', () => {
    component.form.patchValue({ name: 'Taken' });
    component.form.markAsDirty();
    component.save();
    updated$.error(
      new HttpErrorResponse({
        status: 400,
        error: { errors: { name: ['A data layer with this name exists.'] } },
      })
    );
    fixture.detectChanges();

    expect(component.saving).toBeFalse();
    expect(text()).toContain('A data layer with this name exists.');
  });

  it('rejects source links that are not http(s)', () => {
    component.form.patchValue({ source_url: 'javascript:alert(1)' });
    expect(component.form.invalid).toBeTrue();

    component.form.patchValue({ source_url: 'https://example.org' });
    expect(component.form.valid).toBeTrue();
  });

  it('goes back to the list', () => {
    component.cancel();

    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([
      '/workspace',
      7,
      'datalayers',
    ]);
  });

  it('does not offer the form for layers that are not ready', () => {
    service.getDataLayer.and.returnValue(of(detail({ status: 'PROCESSING' })));
    component.load();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(text()).toContain("This layer isn't ready yet");
  });

  it('shows not found for a missing layer', () => {
    service.getDataLayer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );
    component.load();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('main')).toBeNull();
    expect(text()).toContain('not found');
  });

  it('offers a retry when loading fails', () => {
    service.getDataLayer.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    component.load();
    fixture.detectChanges();

    expect(text()).toContain("We couldn't load this data layer");
  });

  it('is hidden without permission', () => {
    workspace$.next({ id: 7, name: 'North Fork', permissions: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('main')).toBeNull();
  });

  describe('style', () => {
    // the preview debounce must start on the fake clock
    function createOnFakeClock() {
      fixture.destroy();
      fixture = TestBed.createComponent(WorkspaceDataLayerEditComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick(250);
      dataLayersState.previewStyle.calls.reset();
    }

    it('fills the style editor from the layer', () => {
      expect(component.styleForm.controls.custom.value).toBeFalse();
      expect(component.styleForm.controls.entries.disabled).toBeTrue();
      expect(component.styleForm.getRawValue().entries.length).toBe(2);
      expect(component.range).toEqual({ min: 0, max: 50 });
    });

    it('does not send the style when it was not touched', () => {
      component.form.patchValue({ units: 'Percent' });
      component.form.markAsDirty();
      component.save();

      expect(service.updateDataLayer).toHaveBeenCalledWith(7, 5, {
        units: 'Percent',
      });
    });

    it('sends the custom style once turned on and edited', () => {
      component.styleForm.controls.custom.setValue(true);
      component.styleForm.controls.entries
        .at(0)
        .controls.color.setValue('#123456');
      component.styleForm.markAsDirty();
      component.save();

      expect(service.updateDataLayer).toHaveBeenCalledWith(7, 5, {
        style: {
          map_type: 'RAMP',
          entries: [
            { value: 0, color: '#123456', label: '0.0' },
            { value: 50, color: '#30123b', label: '50.0' },
          ],
        },
      });
    });

    it('sends null to drop a custom style', () => {
      service.getDataLayer.and.returnValue(
        of(detail({ custom_style: true, style: CUSTOM }))
      );
      component.load();
      component.styleForm.controls.custom.setValue(false);
      component.styleForm.markAsDirty();
      component.save();

      expect(service.updateDataLayer).toHaveBeenCalledWith(7, 5, {
        style: null,
      });
    });

    it('can save with only a style change', () => {
      component.styleForm.controls.custom.setValue(true);
      component.styleForm.markAsDirty();

      expect(component.canSave).toBeTrue();
    });

    it('cannot save an invalid custom style', () => {
      component.styleForm.controls.custom.setValue(true);
      component.styleForm.controls.entries.at(1).controls.value.setValue(-1);
      component.styleForm.markAsDirty();

      expect(component.canSave).toBeFalse();
    });

    it('previews the draft on the map while editing', fakeAsync(() => {
      createOnFakeClock();
      component.styleForm.controls.custom.setValue(true);
      component.styleForm.controls.entries
        .at(0)
        .controls.color.setValue('#123456');
      component.styleForm.markAsDirty();
      component.styleForm.updateValueAndValidity();
      tick(250);

      const draft = dataLayersState.previewStyle.calls.mostRecent()
        .args[0] as StyleJson;
      expect(draft.entries[0].color).toBe('#123456');
      expect(draft.no_data).toEqual(AUTOMATIC.no_data);
    }));

    it('previews the automatic style when a custom one is turned off', fakeAsync(() => {
      service.getDataLayer.and.returnValue(
        of(detail({ custom_style: true, style: CUSTOM }))
      );
      createOnFakeClock();
      component.styleForm.controls.custom.setValue(false);
      component.styleForm.markAsDirty();
      component.styleForm.updateValueAndValidity();
      tick(250);

      expect(dataLayersState.previewStyle).toHaveBeenCalledWith(AUTOMATIC);
    }));

    it('switches between the details and style tabs', () => {
      component.selectTab('style');
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('app-upload-style-editor')
      ).toBeTruthy();
      expect(fixture.nativeElement.querySelector('#layerName')).toBeNull();
    });
  });
});
