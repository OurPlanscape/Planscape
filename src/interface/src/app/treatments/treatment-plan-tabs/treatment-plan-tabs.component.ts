import { AfterViewInit, Component, ViewChild } from '@angular/core';
import {
  MatTab,
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
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  handleTabChange(tabEvent: MatTabChangeEvent) {
    this.setBaseLayerPainting();
  }

  ngAfterViewInit() {
    this.setBaseLayerPainting();
  }

  setBaseLayerPainting() {
    const currentTab: MatTab =
      this.tabGroup._tabs.toArray()[this.tabGroup.selectedIndex ?? 1];
    if (currentTab && currentTab.textLabel === 'Base Layers') {
      this.baseLayersStateService.enableBaseLayerHover(true);
    } else {
      this.baseLayersStateService.enableBaseLayerHover(false);
    }
  }

  constructor(
    private dataLayersStateService: DataLayersStateService,
    private baseLayersStateService: BaseLayersStateService
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
