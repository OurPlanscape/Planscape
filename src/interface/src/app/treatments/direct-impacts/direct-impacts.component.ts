import { Component, Injector, OnDestroy, OnInit } from '@angular/core';
import {
  AsyncPipe,
  DatePipe,
  DecimalPipe,
  NgClass,
  NgFor,
  NgIf,
  NgStyle,
} from '@angular/common';
import { SharedModule } from '@shared';
import { TreatmentsState } from '../treatments.state';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, switchMap } from 'rxjs';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { getMergedRouteData } from '../treatments-routing-data';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';

import {
  ButtonComponent,
  FilterDropdownComponent,
  ModalComponent,
  PanelComponent,
  StatusChipComponent,
  TreatmentTypeIconComponent,
} from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { MetricFiltersComponent } from '../metric-filters/metric-filters.component';
import { ImpactsMetric } from '../metrics';

import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { MatSelectModule } from '@angular/material/select';
import { ExpandedStandDataChartComponent } from '../expanded-stand-data-chart/expanded-stand-data-chart.component';
import { ExpandedChangeOverTimeChartComponent } from '../expanded-change-over-time-chart/expanded-change-over-time-chart.component';
import { MatDialog } from '@angular/material/dialog';
import { ExpandedDirectImpactMapComponent } from '../expanded-direct-impact-map/expanded-direct-impact-map.component';
import { TreatmentProjectArea } from '@types';
import { OverlayLoaderComponent } from 'src/styleguide/overlay-loader/overlay-loader.component';
import { TreatmentsService } from '@services/treatments.service';
import { FileSaverService } from '@services';
import { STAND_SIZES, STAND_SIZES_LABELS } from 'src/app/plan/plan-helpers';
import { standIsForested } from '../stands';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { MetricSelectorComponent } from '../metric-selector/metric-selector.component';
import { TreatmentFilterComponent } from '../treatment-filter/treatment-filter.component';
import { TreatmentSummaryButtonComponent } from '../treatment-summary-button/treatment-summary-button.component';
import { ScenarioState } from 'src/app/maplibre-map/scenario.state';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BreadcrumbService } from '@services/breadcrumb.service';

@UntilDestroy()
@Component({
  selector: 'app-direct-impacts',
  standalone: true,
  imports: [
    AsyncPipe,
    SharedModule,
    DirectImpactsMapComponent,
    PanelComponent,
    MatIconModule,
    MatSelectModule,
    NgIf,
    NgFor,
    MatSlideToggleModule,
    ButtonComponent,
    DatePipe,
    NgClass,
    FormsModule,
    TreatmentMapComponent,
    TreatmentLegendComponent,
    MetricFiltersComponent,
    MetricFiltersComponent,
    NgStyle,
    StandDataChartComponent,
    TreatmentTypeIconComponent,
    ChangeOverTimeChartComponent,
    ExpandedStandDataChartComponent,
    ExpandedChangeOverTimeChartComponent,
    ModalComponent,
    OverlayLoaderComponent,
    StatusChipComponent,
    DecimalPipe,
    MetricSelectorComponent,
    FilterDropdownComponent,
    TreatmentFilterComponent,
    TreatmentSummaryButtonComponent,
  ],
  providers: [
    DirectImpactsStateService,
    TreatmentsState,
    SelectedStandsState,
    TreatedStandsState,
    MapConfigState,
  ],
  templateUrl: './direct-impacts.component.html',
  styleUrl: './direct-impacts.component.scss',
})
export class DirectImpactsComponent implements OnInit, OnDestroy {
  loading = false;
  downloadingShapefile = false;
  standSizeScenarioValue$ = this.scenarioState.currentScenario$.pipe(
    map((scenario) => {
      const stand_size = scenario?.configuration?.stand_size;
      if (!stand_size) {
        return '';
      }
      return `${STAND_SIZES_LABELS[stand_size]} (${STAND_SIZES[stand_size]} acres)`;
    })
  );

  constructor(
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService,
    private treatedStandsState: TreatedStandsState,
    private mapConfigState: MapConfigState,
    private route: ActivatedRoute,
    private router: Router,
    private directImpactsStateService: DirectImpactsStateService,
    private fileSaverService: FileSaverService,
    private dialog: MatDialog,
    private injector: Injector, // Angular's injector for passing shared services
    private scenarioState: ScenarioState,
    private breadcrumbService: BreadcrumbService
  ) {
    const data = getMergedRouteData(this.route.snapshot);
    this.loading = true;
    this.treatmentsState
      .loadTreatmentByRouteData(data)
      .pipe(
        switchMap((_) => this.treatmentsState.treatmentPlan$),
        map((plan) => {
          // if plan is not completed, redirect to config
          if (plan?.status !== 'SUCCESS') {
            this.router.navigate(['../'], { relativeTo: this.route });
          }
          this.mapConfigState.setShowFillProjectAreas(false);
          this.mapConfigState.updateShowTreatmentStands(true);
          this.mapConfigState.updateShowProjectAreas(true);
        }),
        catchError((error) => {
          this.loading = false;
          this.router.navigate(['/']);
          throw error;
        })
      )
      .subscribe(() => {
        this.loading = false;
      });

    this.treatmentsState.breadcrumb$
      .pipe(untilDestroyed(this))
      .subscribe((breadcrumb) => {
        if (breadcrumb) {
          this.breadcrumbService.updateBreadCrumb(breadcrumb);
        }
      });
  }

  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  activeStand$ = this.directImpactsStateService.activeStand$;

  treatmentActionsUsed$ = this.treatedStandsState.treatmentActionsUsed$;

  showTreatmentLegend$ = this.mapConfigState.showTreatmentLegend$;

  selectedChartProjectArea$ =
    this.directImpactsStateService.selectedProjectArea$;

  projectAreaAcres$ = this.selectedChartProjectArea$.pipe(
    map((pa) => this.getProjectAreaAcres(pa))
  );

  summary$ = this.treatmentsState.summary$;

  availableProjectAreas$ = this.treatmentsState.summary$.pipe(
    map((summary) => {
      // TODO: can remove this, in favor of using natsort on backend,
      // so "project area 1", "project area 10", "project area 2"
      // are sorted in semantic ways
      return summary?.project_areas.sort(
        (a, b) => a.project_area_id - b.project_area_id
      );
    })
  );

  standChartTitle(standFeature: MapGeoJSONFeature) {
    if (standIsForested(standFeature)) {
      return 'Percentage Change From Baseline';
    } else {
      return 'Direct Effects';
    }
  }

  forestedLabel(standFeature: MapGeoJSONFeature) {
    if (standIsForested(standFeature)) {
      return `(Forested Stand)`;
    } else return `(Non-forested Stand)`;
  }

  filterOptions$ = this.directImpactsStateService.reportMetrics$.pipe(
    map((metrics) => Object.values(metrics).map((metric) => metric.id))
  );

  updateReportMetric(data: ImpactsMetric) {
    this.directImpactsStateService.updateReportMetric(data);
  }

  ngOnInit(): void {
    // Register the plugin only when this component is initialized
    Chart.register(ChartDataLabels);
    this.mapConfigState.setStandSelectionEnabled(true);
  }

  ngOnDestroy(): void {
    // Unregister the plugin when the component is destroyed
    Chart.unregister(ChartDataLabels);
  }

  setChartProjectArea(pa: TreatmentProjectArea | 'All') {
    if (!pa || pa === 'All') {
      this.directImpactsStateService.setProjectAreaForChanges('All');
      const s = this.treatmentsState.getCurrentSummary();
      this.mapConfigState.updateMapCenter(s.extent);
      return;
    }
    this.directImpactsStateService.setProjectAreaForChanges(pa);
    this.mapConfigState.updateMapCenter(pa.extent);
  }

  expandChangeChart() {
    this.dialog.open(ExpandedChangeOverTimeChartComponent, {
      injector: this.injector, // Pass the current injector to the dialog
    });
  }

  expandStandChart() {
    this.dialog.open(ExpandedStandDataChartComponent, {
      injector: this.injector, // Pass the current injector to the dialog
      autoFocus: false,
    });
  }

  expandMaps() {
    this.dialog.open(ExpandedDirectImpactMapComponent, {
      injector: this.injector, // Pass the current injector to the dialog
      autoFocus: false,
    });
  }

  download() {
    this.downloadingShapefile = true;
    const filename =
      'treatment_plan_' + this.treatmentsState.getTreatmentPlanId();

    this.treatmentsService
      .downloadTreatment(this.treatmentsState.getTreatmentPlanId())
      .subscribe((data) => {
        const blob = new Blob([data], {
          type: 'application/zip',
        });
        this.fileSaverService.saveAs(blob, filename);
        this.downloadingShapefile = false;
      });
  }

  getProjectAreaAcres(
    selectedProjectArea: TreatmentProjectArea | 'All' | null
  ): number {
    const allAcres = !selectedProjectArea || selectedProjectArea === 'All';
    if (allAcres) {
      return this.treatmentsState.getTotalAcres();
    }
    return this.treatmentsState.getAcresForProjectArea(
      selectedProjectArea.project_area_name
    );
  }
}
