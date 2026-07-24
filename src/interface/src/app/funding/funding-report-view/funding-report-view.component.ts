import { AsyncPipe, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { BaseLayersComponent } from '@app/base-layers/base-layers/base-layers.component';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { MapNavbarComponent } from '@app/maplibre-map/map-nav-bar/map-nav-bar.component';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MapConfigService } from '@app/maplibre-map/map-config.service';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { ProjectArea } from '@app/types';
import { OpacitySliderComponent } from '@styleguide';
import {
  ToggleButtonsConfig,
  ToggleTabsComponent,
} from '@styleguide/toggle-tabs/toggle-tabs.component';
import { Extent, FlameLengthInterval, FundingReport } from '@types';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

import { FundingMapConfigState } from '../funding-map-config-state';
import { FundingProjectAreasSelectorComponent } from '../funding-project-areas-selector/funding-project-areas-selector.component';
import { FilterProjectFormat } from '../funding-project-areas-selector/funding-project-areas-selector.component';
import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import {
  FundingReportComponent,
  ReportInteractivity,
} from '../funding-report/funding-report.component';
import { generateLegendFromReport } from '../funding-report/funding-report.helper';

/**
 * Presentational shell for a funding report: the sidebar (Report / Data Layers
 * toggle, introduction, project-area selector, report) and the right-side map.
 * It owns only layout and view state; all data arrives via inputs, so the same
 * shell backs both the authed full report and the public shared view.
 *
 * The map-related state (`FundingMapConfigState`, selection, opacity) and the
 * services the map / data-layer children need are provided here, keeping the
 * containers free of any map wiring.
 */
@Component({
  selector: 'app-funding-report-view',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    BaseLayersComponent,
    DataLayersComponent,
    FundingProjectAreasSelectorComponent,
    FundingReportComponent,
    FundingReportMapComponent,
    MapNavbarComponent,
    MatProgressSpinnerModule,
    MatTabsModule,
    NavBarComponent,
    OpacitySliderComponent,
    ToggleTabsComponent,
  ],
  providers: [
    FundingMapConfigState,
    { provide: MapConfigState, useExisting: FundingMapConfigState },
    MapConfigService,
    DataLayersStateService,
  ],
  templateUrl: './funding-report-view.component.html',
  styleUrl: './funding-report-view.component.scss',
})
export class FundingReportViewComponent {
  private readonly _report$ = new BehaviorSubject<FundingReport | null>(null);
  private readonly _allProjectAreas$ = new BehaviorSubject<ProjectArea[]>([]);

  /** The report to render. `null` shows a loading spinner. */
  @Input() set report(value: FundingReport | null) {
    this._report$.next(value);
  }

  /** Project areas the legend needs for its acreage figures. */
  @Input() set allProjectAreas(value: ProjectArea[] | null) {
    this._allProjectAreas$.next(value ?? []);
  }

  /** Options for the "Viewing outcomes for" selector. */
  @Input() projectAreaOptions: FilterProjectFormat[] | null = [];

  /** Water / flame length config behaviour — see {@link ReportInteractivity}. */
  @Input() interactive: ReportInteractivity = true;

  /** Seed the (static) flame length interval for the read-only view. */
  @Input() flameLength?: FlameLengthInterval;
  /** Seed the (static) water availability target for the read-only view. */
  @Input() waterAvailability?: number;

  /** True while an authed water recalculation is in flight. */
  @Input() updatingWaterAvailability = false;

  /**
   * Explicit map bounds. Needed by the public view, which has no plan in state
   * to derive them from; the authed view leaves this null and the map falls back
   * to the planning-area geometry.
   */
  @Input() mapBounds: Extent | null = null;

  /** Emitted when the user edits the water target (interactive mode only). */
  @Output() updateWaterAvailability = new EventEmitter<number>();

  report$ = this._report$.asObservable();
  selectedProjectAreas$ = this.fundingMapConfigState.selectedProjectAreas$;
  opacity$ = this.fundingMapConfigState.opacity$;

  treatmentDataLayerId$ = this.report$.pipe(
    map((report) => report?.treatment_datalayer ?? null)
  );

  aetDataLayerId$ = this.report$.pipe(
    map((report) => report?.aet_datalayer ?? null)
  );

  legendData$ = combineLatest([
    this.report$,
    this.selectedProjectAreas$,
    this._allProjectAreas$,
  ]).pipe(
    map(([report, areas, projAreas]) =>
      generateLegendFromReport(report?.results ?? null, areas, projAreas)
    )
  );

  tabButtons: ToggleButtonsConfig[] = [
    { name: 'Report', value: 'report', icon: 'analytics_outline' },
    { name: 'Data Layers', value: 'data_layers', icon: 'layers_outline' },
  ];
  currentView = 'report';
  tabIndex = 0;

  constructor(private fundingMapConfigState: FundingMapConfigState) {}

  handleToggleSelection(selection: string): void {
    this.currentView = selection;
  }

  handleOpacityChange(opacity: number): void {
    this.fundingMapConfigState.setOpacity(opacity);
  }
}
