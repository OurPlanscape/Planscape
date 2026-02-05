import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { SharedModule } from '@shared';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { ProjectAreaTreatmentsTabComponent } from '@treatments/treatments-tab/treatments-tab.component';
import { SelectedStandsState } from '@treatments/treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { AcresTreatedComponent } from '@treatments/acres-treated/acres-treated.component';
import { FeaturesModule } from '@features/features.module';
import { DataLayersComponent } from '@data-layers/data-layers/data-layers.component';
import { BaseLayersComponent } from '@base-layers/base-layers/base-layers.component';
import { DataLayersStateService } from '@data-layers/data-layers.state.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { skip } from 'rxjs';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';

@UntilDestroy()
@Component({
  selector: 'app-project-area',
  standalone: true,
  imports: [
    MatDialogModule,
    MatDividerModule,
    MatTabsModule,
    ProjectAreaTreatmentsTabComponent,
    SharedModule,
    AcresTreatedComponent,
    FeaturesModule,
    DataLayersComponent,
    BaseLayersComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent implements OnDestroy, AfterViewInit {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  constructor(
    private selectedStandsState: SelectedStandsState,
    private treatmentsState: TreatmentsState,
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

  ngAfterViewInit() {
    this.baseLayersStateService.enableBaseLayerHover(false);
  }

  projectAreaId?: number;

  ngOnDestroy(): void {
    this.selectedStandsState.clearStands();
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
    this.baseLayersStateService.enableBaseLayerHover(true);
  }
}
