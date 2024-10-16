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

  changeValue(num: number) {
    this.mapConfigState.setTreatedStandsOpacity(num);
  }

  ngOnDestroy(): void {
    this.selectedStandsState.clearStands();
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }
}
