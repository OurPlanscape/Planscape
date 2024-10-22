import { Component, OnDestroy } from '@angular/core';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectAreaTreatmentsTabComponent } from '../treatments-tab/treatments-tab.component';
import { OpacitySliderComponent } from '../../../styleguide/opacity-slider/opacity-slider.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { TreatmentStandsProgressBarComponent } from '@styleguide';
import { combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-treatment-project-area',
  standalone: true,
  imports: [
    TreatmentMapComponent,
    MatTabsModule,
    ProjectAreasTabComponent,
    JsonPipe,
    AsyncPipe,
    RouterLink,
    ProjectAreaTreatmentsTabComponent,
    OpacitySliderComponent,
    TreatmentStandsProgressBarComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent implements OnDestroy {
  constructor(
    private mapConfigState: MapConfigState,
    private selectedStandsState: SelectedStandsState,
    private treatmentsState: TreatmentsState
  ) {}

  opacity = this.mapConfigState.treatedStandsOpacity$;
  projectAreaId$ = this.treatmentsState.projectAreaId$;

  treatedStands() {
    return combineLatest([
      this.treatmentsState.summary$,
      this.treatmentsState.projectAreaId$,
    ]).pipe(
      map(([summaryData, projectId]) => {
        const projectAreaData = summaryData?.project_areas?.find(
          (project) => project.project_area_id === projectId
        );
        return projectAreaData?.prescriptions
          .map((p) => p.treated_stand_count)
          .reduce((acc, standCount) => {
            return acc + standCount;
          });
      })
    );
  }

  totalStands() {
    return combineLatest([
      this.treatmentsState.summary$,
      this.treatmentsState.projectAreaId$,
    ]).pipe(
      map(([summaryData, projectId]) => {
        const projectAreaData = summaryData?.project_areas?.find(
          (project) => project.project_area_id === projectId
        );
        return projectAreaData?.total_stand_count;
      })
    );
  }

  changeValue(num: number) {
    this.mapConfigState.setTreatedStandsOpacity(num);
  }

  ngOnDestroy(): void {
    this.selectedStandsState.clearStands();
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }
}
