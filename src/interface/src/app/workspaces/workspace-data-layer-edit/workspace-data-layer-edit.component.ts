import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, NgIf } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  ControlComponent,
  LayerComponent,
  MapComponent,
} from '@maplibre/ngx-maplibre-gl';
import {
  LngLatBoundsLike,
  Map as MapLibreMap,
  RequestTransformFunction,
} from 'maplibre-gl';
import { BehaviorSubject, debounceTime, filter } from 'rxjs';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
  ButtonComponent,
  EmptyStateComponent,
  InputDirective,
  InputFieldComponent,
  ModalInfoComponent,
  OverlayLoaderComponent,
} from '@styleguide';
import {
  ToggleButtonsConfig,
  ToggleTabsComponent,
} from '@styleguide/toggle-tabs/toggle-tabs.component';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { ResourceUnavailableComponent } from '@app/shared/resource-unavailable/resource-unavailable.component';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { AuthService, DataLayersService } from '@services';
import { WorkspaceDataLayersService } from '@services/workspace-data-layers.service';
import { FeatureService } from '@features/feature.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { MapConfigService } from '@maplibre-map/map-config.service';
import { MapDataLayerComponent } from '@maplibre-map/map-data-layer/map-data-layer.component';
import { MapLayerColorLegendComponent } from '@maplibre-map/map-layer-color-legend/map-layer-color-legend.component';
import { addRequestHeaders } from '@maplibre-map/maplibre.helper';
import { FrontendConstants } from '@map/map.constants';
import { SNACK_NOTICE_CONFIG } from '@shared';
import {
  Workspace,
  WorkspaceDataLayerDetail,
  WorkspaceDataLayerMetadata,
  WorkspaceDataLayerUpdate,
} from '@types';
import { WorkspaceState } from '../workspace.state';
import { UploadStyleEditorComponent } from './upload-style-editor/upload-style-editor.component';
import {
  createStyleForm,
  draftStyle,
  fillStyleForm,
  setCustomStyle,
  stylePayload,
} from './upload-style-editor/upload-style-form';
import { canManageDataLayers } from '../data-layer-access';

type EditableField = keyof WorkspaceDataLayerMetadata | 'name';

const EDITABLE_FIELDS: EditableField[] = [
  'name',
  'description',
  'units',
  'vintage',
  'geographic_coverage',
  'source_url',
];

@UntilDestroy()
@Component({
  selector: 'app-workspace-data-layer-edit',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    NgIf,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MapComponent,
    LayerComponent,
    ControlComponent,
    ButtonComponent,
    EmptyStateComponent,
    InputDirective,
    InputFieldComponent,
    ModalInfoComponent,
    OverlayLoaderComponent,
    NavBarComponent,
    ResourceUnavailableComponent,
    MapDataLayerComponent,
    MapLayerColorLegendComponent,
    ToggleTabsComponent,
    UploadStyleEditorComponent,
  ],
  providers: [DataLayersStateService, MapConfigState, MapConfigService],
  templateUrl: './workspace-data-layer-edit.component.html',
  styleUrl: './workspace-data-layer-edit.component.scss',
})
export class WorkspaceDataLayerEditComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private breadcrumbService = inject(BreadcrumbService);
  private featureService = inject(FeatureService);
  private workspaceState = inject(WorkspaceState);
  private workspaceDataLayersService = inject(WorkspaceDataLayersService);
  private dataLayersService = inject(DataLayersService);
  private dataLayersState = inject(DataLayersStateService);
  layerLoading$ = this.dataLayersState.loadingLayer$;
  private mapConfigState = inject(MapConfigState);

  readonly workspaceId: number = this.route.snapshot.data['workspaceId'];
  readonly dataLayerId = Number(
    this.route.snapshot.paramMap.get('dataLayerId')
  );

  currentWorkspace$ = this.workspaceState.currentWorkspace$;
  isWorkspaceLoading$ = this.workspaceState.isWorkspaceLoading$;
  workspaceNotFound$ = this.workspaceState.workspaceNotFound$;
  baseLayerUrl$ = this.mapConfigState.baseMapUrl$;

  readonly minZoom = FrontendConstants.MAPLIBRE_MAP_MIN_ZOOM;
  readonly maxZoom = FrontendConstants.MAPLIBRE_MAP_MAX_ZOOM;

  detail$ = new BehaviorSubject<WorkspaceDataLayerDetail | null>(null);
  loadState: 'loading' | 'loaded' | 'not-found' | 'error' = 'loading';
  saving = false;
  error: string | null = null;
  mapLibreMap?: MapLibreMap;

  form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
    description: new FormControl('', { nonNullable: true }),
    units: new FormControl('', { nonNullable: true }),
    vintage: new FormControl('', { nonNullable: true }),
    geographic_coverage: new FormControl('', { nonNullable: true }),
    source_url: new FormControl('', {
      nonNullable: true,
      validators: [Validators.pattern(/^\s*(https?:\/\/\S+)?\s*$/i)],
    }),
  });

  styleForm = createStyleForm();
  // the raster's value range, for even breaks
  range: { min: number; max: number } | null = null;

  readonly tabs: ToggleButtonsConfig[] = [
    { name: 'Details', icon: 'description', value: 'details' },
    { name: 'Style', icon: 'palette', value: 'style' },
  ];
  tab: 'details' | 'style' = 'details';

  constructor() {
    inject(MapConfigService).initialize();
    this.styleForm.controls.custom.valueChanges
      .pipe(untilDestroyed(this))
      .subscribe((custom) => setCustomStyle(this.styleForm, custom));
    // a reset (load/save) isn't an edit: the saved style replaces the draft
    // once the refreshed layer is drawn
    this.styleForm.valueChanges
      .pipe(
        debounceTime(250),
        filter(() => this.styleForm.dirty),
        untilDestroyed(this)
      )
      .subscribe(() => this.previewDraft());
  }

  get canSave() {
    return (
      (this.form.dirty || this.styleForm.dirty) &&
      this.form.valid &&
      this.styleForm.valid &&
      !this.saving
    );
  }

  selectTab(tab: string) {
    this.tab = tab === 'style' ? 'style' : 'details';
  }

  ngOnInit() {
    this.breadcrumbService.updateBreadCrumb({
      label: 'Data Layers',
      backUrl: `/workspace/${this.workspaceId}/datalayers`,
    });
    this.load();
  }

  ngOnDestroy() {
    this.dataLayersState.previewStyle(null);
  }

  canManage(workspace: Workspace) {
    return canManageDataLayers(workspace, this.featureService);
  }

  bounds(detail: WorkspaceDataLayerDetail): LngLatBoundsLike | null {
    return detail.bbox;
  }

  load() {
    this.loadState = 'loading';
    this.workspaceDataLayersService
      .getDataLayer(this.workspaceId, this.dataLayerId)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (detail) => {
          this.show(detail);
          this.loadState = 'loaded';
          this.refreshPreview();
        },
        error: (error: HttpErrorResponse) =>
          (this.loadState = error.status === 404 ? 'not-found' : 'error'),
      });
  }

  save() {
    const detail = this.detail$.value;
    const changes = this.changedFields();
    if (!detail || this.form.invalid || this.styleForm.invalid || this.saving) {
      return;
    }
    if (Object.keys(changes).length === 0) {
      this.form.markAsPristine();
      this.styleForm.markAsPristine();
      return;
    }
    this.saving = true;
    this.error = null;
    this.workspaceDataLayersService
      .updateDataLayer(this.workspaceId, detail.id, changes)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (updated) => {
          this.saving = false;
          this.show(updated);
          this.refreshPreview();
          this.snackBar.open('Changes saved.', 'Dismiss', SNACK_NOTICE_CONFIG);
        },
        error: (error: HttpErrorResponse) => {
          this.saving = false;
          this.error = errorMessage(error);
        },
      });
  }

  cancel() {
    this.router.navigate(['/workspace', this.workspaceId, 'datalayers']);
  }

  mapLoaded(map: MapLibreMap) {
    this.mapLibreMap = map;
  }

  transformRequest: RequestTransformFunction = (url, resourceType) =>
    addRequestHeaders(url, resourceType, this.authService.getAuthCookie());

  private show(detail: WorkspaceDataLayerDetail) {
    this.detail$.next(detail);
    this.form.reset(pickEditable(detail));
    fillStyleForm(this.styleForm, detail.style, detail.custom_style);
  }

  private changedFields(): WorkspaceDataLayerUpdate {
    const detail = this.detail$.value;
    const values = this.form.getRawValue();
    const changes: WorkspaceDataLayerUpdate = {};
    for (const field of EDITABLE_FIELDS) {
      const value = values[field].trim();
      if (detail && value !== detail[field]) {
        changes[field] = value;
      }
    }
    if (detail && this.styleForm.dirty) {
      if (this.styleForm.controls.custom.value) {
        changes.style = stylePayload(this.styleForm);
      } else if (detail.custom_style) {
        changes.style = null;
      }
    }
    return changes;
  }

  // Unsaved style edits are drawn on the map and legend as they're made
  private previewDraft() {
    const detail = this.detail$.value;
    if (!detail) {
      return;
    }
    if (!this.styleForm.controls.custom.value) {
      this.dataLayersState.previewStyle(
        detail.custom_style ? detail.default_style : null
      );
    } else if (this.styleForm.valid) {
      this.dataLayersState.previewStyle(
        draftStyle(this.styleForm, detail.style.no_data)
      );
    }
  }

  // The legend title comes from the saved units, so the preview follows saves
  private refreshPreview() {
    this.dataLayersService
      .getDataLayerById(this.dataLayerId)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (layer) => {
          const stats = layer.info?.stats?.[0];
          this.range =
            stats && Number.isFinite(stats.min) && Number.isFinite(stats.max)
              ? { min: stats.min, max: stats.max }
              : null;
          this.dataLayersState.selectDataLayer(layer);
        },
        error: () => undefined,
      });
  }
}

function pickEditable(
  detail: WorkspaceDataLayerDetail
): Record<EditableField, string> {
  const metadata: WorkspaceDataLayerMetadata = {
    description: detail.description,
    units: detail.units,
    vintage: detail.vintage,
    geographic_coverage: detail.geographic_coverage,
    source_url: detail.source_url,
  };
  return { name: detail.name, ...metadata };
}

function errorMessage(error: HttpErrorResponse) {
  const first = error.status === 400 ? firstMessage(error.error?.errors) : null;
  return first ?? "Couldn't save the changes. Please try again.";
}

// DRF nests field errors, e.g. {style: {entries: [{color: ['...']}]}}
function firstMessage(errors: unknown): string | null {
  if (typeof errors === 'string') {
    return errors;
  }
  const children = Array.isArray(errors)
    ? errors
    : errors && typeof errors === 'object'
      ? Object.values(errors)
      : [];
  for (const child of children) {
    const message = firstMessage(child);
    if (message) {
      return message;
    }
  }
  return null;
}
