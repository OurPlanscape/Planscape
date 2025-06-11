import { AfterViewInit, Component, ViewChild } from '@angular/core';
import {
  MatTabChangeEvent,
  MatTabGroup,
  MatTabsModule,
} from '@angular/material/tabs';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { FeaturesModule } from 'src/app/features/features.module';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { BaseLayersComponent } from 'src/app/base-layers/base-layers/base-layers.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { skip } from 'rxjs';
import { BaseLayersStateService } from '../../base-layers/base-layers.state.service';
import { TreatmentsState } from '../treatments.state';

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
export class TreatmentPlanTabsComponent implements AfterViewInit {
  private readonly BASE_LAYER_INDEX = 2;

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  ngAfterViewInit() {
    const currentIndex = this.tabGroup.selectedIndex;
    this.setTabHoverOptions(currentIndex);
  }

  handleSelectedTab(selectedTab: MatTabChangeEvent) {
    this.setTabHoverOptions(selectedTab.index);
  }

  setTabHoverOptions(curIndex: number | null) {
    if (curIndex === this.BASE_LAYER_INDEX) {
      this.baseLayersStateService.enableBaseLayerHover(true);
      this.treatmentStateService.enableTreatmentTooltips(false);
    } else {
      this.baseLayersStateService.enableBaseLayerHover(false);
      this.treatmentStateService.enableTreatmentTooltips(true);
    }
  }

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private baseLayersStateService: BaseLayersStateService,
    private treatmentStateService: TreatmentsState
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = 1;
        }
      });
  }
}
