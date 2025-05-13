import { Component, OnDestroy, ViewChild } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { SharedModule } from '@shared';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabChangeEvent, MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { ProjectAreaTreatmentsTabComponent } from '../treatments-tab/treatments-tab.component';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { AcresTreatedComponent } from '../acres-treated/acres-treated.component';
import { LeftLoadingOverlayComponent } from '../left-loading-overlay/left-loading-overlay.component';
import { FeaturesModule } from 'src/app/features/features.module';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';
import { BaseLayersComponent } from 'src/app/base-layers/base-layers/base-layers.component';
import { DataLayersStateService } from '../../data-layers/data-layers.state.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { skip } from 'rxjs';

@UntilDestroy()
@Component({
  selector: 'app-project-area',
  standalone: true,
  imports: [
    AsyncPipe,
    MapBaseLayerComponent,
    MatDialogModule,
    MatDividerModule,
    MatTabsModule,
    NgIf,
    ProjectAreaTreatmentsTabComponent,
    SharedModule,
    AcresTreatedComponent,
    LeftLoadingOverlayComponent,
    FeaturesModule,
    DataLayersComponent,
    BaseLayersComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent implements OnDestroy {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(
    private selectedStandsState: SelectedStandsState,
    private treatmentsState: TreatmentsState,
    private dataLayersStateService: DataLayersStateService
  ) {
    this.dataLayersStateService.paths$
      .pipe(untilDestroyed(this), skip(1))
      .subscribe((path) => {
        if (path.length > 0) {
          this.tabGroup.selectedIndex = 1;
        }
      });
  }

  handleTabChange(selectedTab: MatTabChangeEvent) {
    if (selectedTab) {
      this.dataLayersStateService.setSelectedTab(selectedTab.tab);
    }
  }


  projectAreaId?: number;

  ngOnDestroy(): void {
    this.selectedStandsState.clearStands();
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }
}
