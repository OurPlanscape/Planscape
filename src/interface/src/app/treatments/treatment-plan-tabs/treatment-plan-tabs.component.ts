import { Component, ViewChild, AfterViewInit } from '@angular/core';
import {
  MatTab,
  MatTabChangeEvent,
  MatTabGroup,
  MatTabsModule,
} from '@angular/material/tabs';
import { TreatmentPlanNotesComponent } from '../treatment-plan-notes/treatment-plan-notes.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { FeaturesModule } from 'src/app/features/features.module';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { BaseLayersComponent } from 'src/app/base-layers/base-layers/base-layers.component';
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
    BaseLayersComponent,
  ],
  templateUrl: './treatment-plan-tabs.component.html',
  styleUrl: './treatment-plan-tabs.component.scss',
})
export class TreatmentPlanTabsComponent implements AfterViewInit {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  handleTabChange(tabEvent: MatTabChangeEvent) {
    if (tabEvent.tab) {
      this.dataLayersStateService.setSelectedTab(tabEvent.tab);
    }
  }

  ngAfterViewInit() {
    this.setSelectedTab();
  }

  setSelectedTab() {
    const currentTab: MatTab =
      this.tabGroup._tabs.toArray()[this.tabGroup.selectedIndex ?? 1];
    this.dataLayersStateService.setSelectedTab(currentTab);
  }

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
