import { Component, Injector, OnDestroy, OnInit } from '@angular/core';
import {
  AsyncPipe,
  DatePipe,
  JsonPipe,
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
import { MapConfigState } from '../treatment-map/map-config.state';
import { getMergedRouteData } from '../treatments-routing-data';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { DirectImpactsSyncedMapsComponent } from '../direct-impacts-synced-maps/direct-impacts-synced-maps.component';
import {
  ButtonComponent,
  ModalComponent,
  PanelComponent,
  PanelIconButton,
  TreatmentTypeIconComponent,
} from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import {
  MatSlideToggleChange,
  MatSlideToggleModule,
} from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { MetricFiltersComponent } from '../metric-filters/metric-filters.component';
import { ImpactsMetric } from '../metrics';
import { DirectImpactsMapLegendComponent } from '../direct-impacts-map-legend/direct-impacts-map-legend.component';
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

@Component({
  selector: 'app-direct-impacts',
  standalone: true,
  imports: [
    AsyncPipe,
    SharedModule,
    DirectImpactsMapComponent,
    DirectImpactsSyncedMapsComponent,
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
    DirectImpactsMapLegendComponent,
    JsonPipe,
    StandDataChartComponent,
    TreatmentTypeIconComponent,
    ChangeOverTimeChartComponent,
    ExpandedStandDataChartComponent,
    ExpandedChangeOverTimeChartComponent,
    ModalComponent,
    OverlayLoaderComponent,
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

  constructor(
    private treatmentsState: TreatmentsState,
    private treatmentsService: TreatmentsService,
    private mapConfigState: MapConfigState,
    private route: ActivatedRoute,
    private router: Router,
    private directImpactsStateService: DirectImpactsStateService,
    private fileSaverService: FileSaverService,
    private dialog: MatDialog,
    private injector: Injector // Angular's injector for passing shared services
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
          this.loading = false;
        }),
        catchError((error) => {
          this.loading = false;
          this.router.navigate(['/']);
          throw error;
        })
      )
      .subscribe();
  }

  navState$ = this.treatmentsState.navState$;
  treatmentPlan$ = this.treatmentsState.treatmentPlan$;
  activeStand$ = this.directImpactsStateService.activeStand$;

  showTreatmentLegend$ = this.mapConfigState.showTreatmentLegend$;

  selectedChartProjectArea$ =
    this.directImpactsStateService.selectedProjectArea$;
  showTreatmentPrescription = false;
  changeChartButtons: PanelIconButton[] = [
    { icon: 'open_in_full', actionName: 'expand' },
  ];

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

  showTreatmentPrescription$ =
    this.directImpactsStateService.showTreatmentPrescription$;

  standChartPanelTitle$ = this.directImpactsStateService.activeStand$.pipe(
    map((activeStand) => {
      if (!activeStand) {
        return 'Stand Level Data Unavailable';
      }
      return `${activeStand.properties['project_area_name']}, Stand ${activeStand.properties['id']}`;
    })
  );

  activeMetric$ = this.directImpactsStateService.activeMetric$.pipe(
    map((m) => m.metric)
  );

  filterOptions$ = this.directImpactsStateService.reportMetrics$.pipe(
    map((metrics) => Object.values(metrics).map((metric) => metric.id))
  );

  activateMetric(data: ImpactsMetric) {
    this.directImpactsStateService.setActiveMetric(data);
  }

  updateReportMetric(data: ImpactsMetric) {
    this.directImpactsStateService.updateReportMetric(data);
  }

  ngOnInit(): void {
    // Register the plugin only when this component is initialized
    Chart.register(ChartDataLabels);
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

  saveShowTreatmentPrescription(value: MatSlideToggleChange) {
    this.mapConfigState.setTreatmentLegendVisible(value.checked);
    this.directImpactsStateService.setShowTreatmentPrescription(value.checked);
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
}
