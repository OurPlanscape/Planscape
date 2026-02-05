import { Component, ViewChild } from '@angular/core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { ProjectAreasTabComponent } from '@app/treatments/project-areas-tab/project-areas-tab.component';
import { FeaturesModule } from '@app/features/features.module';
import { DataLayersComponent } from '@app/data-layers/data-layers/data-layers.component';
import { BaseLayersComponent } from '@app/base-layers/base-layers/base-layers.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { skip } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-treatment-plan-tabs',
  standalone: true,
  imports: [
    MatTabsModule,
    ProjectAreasTabComponent,
    FeaturesModule,
    DataLayersComponent,
    BaseLayersComponent,
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
