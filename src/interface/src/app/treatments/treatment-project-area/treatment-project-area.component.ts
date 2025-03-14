import { Component, OnDestroy } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { SharedModule } from '@shared';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectAreaTreatmentsTabComponent } from '../treatments-tab/treatments-tab.component';
import { MapConfigState } from '../../maplibre-map/map-config.state';
import { SelectedStandsState } from '../treatment-map/selected-stands.state';
import { TreatmentsState } from '../treatments.state';
import { MapBaseLayerComponent } from '../map-base-layer/map-base-layer.component';
import { AcresTreatedComponent } from '../acres-treated/acres-treated.component';
import { LeftLoadingOverlayComponent } from '../left-loading-overlay/left-loading-overlay.component';
import { FeaturesModule } from 'src/app/features/features.module';
import { DataLayersComponent } from '../../data-layers/data-layers/data-layers.component';

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
  activeProjectArea$ = this.treatmentsState.activeProjectArea$;
  projectAreaId?: number;
  refreshing$ = this.treatmentsState.reloadingSummary$;

  changeValue(num: number) {
    this.mapConfigState.setTreatedStandsOpacity(num);
  }

  ngOnDestroy(): void {
    this.selectedStandsState.clearStands();
    this.treatmentsState.setShowApplyTreatmentsDialog(false);
  }
}
