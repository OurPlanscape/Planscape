import { Component } from '@angular/core';

import { SharedModule } from '@shared';
import { TreatmentsState } from '../treatments.state';
import { map } from 'rxjs';
import { MapConfigState } from '../../maplibre-map/map-config.state';

import { ButtonComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MetricFiltersComponent } from '../metric-filters/metric-filters.component';
import { ImpactsMetric } from '../metrics';

import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogRef } from '@angular/material/dialog';
import { Scenario, TreatmentProjectArea } from '@types';
import { ExpandedPanelComponent } from 'src/styleguide/expanded-panel/expanded-panel.component';
import { TreatmentFilterComponent } from '../treatment-filter/treatment-filter.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-expanded-change-over-time-chart',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    ButtonComponent,
    FormsModule,
    MetricFiltersComponent,
    MetricFiltersComponent,
    ChangeOverTimeChartComponent,
    ExpandedPanelComponent,
    TreatmentFilterComponent,
  ],
  templateUrl: './expanded-change-over-time-chart.component.html',
  styleUrl: './expanded-change-over-time-chart.component.scss',
})
export class ExpandedChangeOverTimeChartComponent {
  loading = false;
  downloadingShapefile = false;
  scenario: Scenario | null = null;
  valueKey = 'value' as any;

  constructor(
    private treatmentsState: TreatmentsState,
    private mapConfigState: MapConfigState,
    private directImpactsStateService: DirectImpactsStateService,
    public dialogRef: MatDialogRef<ExpandedChangeOverTimeChartComponent>
  ) {}

  treatmentPlan$ = this.treatmentsState.treatmentPlan$;

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

  filterOptions$ = this.directImpactsStateService.reportMetrics$.pipe(
    map((metrics) => Object.values(metrics).map((metric) => metric.id))
  );

  treatmentTypeOptions$ = this.treatmentsState.treatmentTypeOptions$;

  updateReportMetric(data: ImpactsMetric) {
    this.directImpactsStateService.updateReportMetric(data);
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

  close() {
    this.dialogRef.close();
  }
}
