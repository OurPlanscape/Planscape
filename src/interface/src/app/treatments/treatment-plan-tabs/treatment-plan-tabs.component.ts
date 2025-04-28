import { Component, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { TreatmentPlanNotesComponent } from '../treatment-plan-notes/treatment-plan-notes.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { FeaturesModule } from 'src/app/features/features.module';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { skip } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-treatment-plan-tabs',
  standalone: true,
  imports: [
    MatTabsModule,
    TreatmentPlanNotesComponent,
    ProjectAreasTabComponent,
    MapBaseLayerComponent,
    FeaturesModule,
    DataLayersComponent,
  ],
  templateUrl: './treatment-plan-tabs.component.html',
  styleUrl: './treatment-plan-tabs.component.scss',
})
export class TreatmentPlanTabsComponent {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(private dataLayersStateService: DataLayersStateService) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = 1;
        }
      });
  }
}
