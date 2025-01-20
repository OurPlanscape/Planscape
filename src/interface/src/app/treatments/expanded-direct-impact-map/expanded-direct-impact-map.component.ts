import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ModalComponent } from '@styleguide';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { MatDialogRef } from '@angular/material/dialog';
import { DirectImpactsSyncedMapsComponent } from '../direct-impacts-synced-maps/direct-impacts-synced-maps.component';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { ExpandedPanelComponent } from '../../../styleguide/expanded-panel/expanded-panel.component';
import { MapConfigState } from '../treatment-map/map-config.state';

@Component({
  selector: 'app-expanded-direct-impact-map',
  standalone: true,
  imports: [
    AsyncPipe,
    ModalComponent,
    StandDataChartComponent,
    DirectImpactsSyncedMapsComponent,
    TreatmentMapComponent,
    TreatmentLegendComponent,
    NgIf,
    ExpandedPanelComponent,
  ],
  templateUrl: './expanded-direct-impact-map.component.html',
  styleUrl: './expanded-direct-impact-map.component.scss',
})
export class ExpandedDirectImpactMapComponent {
  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    private mapConfigState: MapConfigState,
    public dialogRef: MatDialogRef<ExpandedDirectImpactMapComponent>
  ) {}

  showTreatmentPrescription$ =
    this.directImpactsStateService.showTreatmentPrescription$;

  showTreatmentLegend$ = this.mapConfigState.showTreatmentLegend$;

  close() {
    this.dialogRef.close();
  }
}
