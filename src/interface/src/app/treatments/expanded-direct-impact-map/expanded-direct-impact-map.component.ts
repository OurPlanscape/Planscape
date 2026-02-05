import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ExpandedPanelComponent, ModalComponent } from '@styleguide';
import { StandDataChartComponent } from '@treatments/stand-data-chart/stand-data-chart.component';
import { MatDialogRef } from '@angular/material/dialog';
import { TreatmentMapComponent } from '@treatments/treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '@treatments/treatment-legend/treatment-legend.component';
import { MapConfigState } from '@maplibre/map-config.state';
import { DirectImpactsMapComponent } from '@treatments/direct-impacts-map/direct-impacts-map.component';
import { TreatedStandsState } from '@treatments/treatment-map/treated-stands.state';

@Component({
  selector: 'app-expanded-direct-impact-map',
  standalone: true,
  imports: [
    AsyncPipe,
    ModalComponent,
    StandDataChartComponent,
    TreatmentMapComponent,
    TreatmentLegendComponent,
    NgIf,
    ExpandedPanelComponent,
    DirectImpactsMapComponent,
  ],
  templateUrl: './expanded-direct-impact-map.component.html',
  styleUrl: './expanded-direct-impact-map.component.scss',
})
export class ExpandedDirectImpactMapComponent {
  constructor(
    private mapConfigState: MapConfigState,
    private treatedStandsState: TreatedStandsState,
    public dialogRef: MatDialogRef<ExpandedDirectImpactMapComponent>
  ) {}

  showTreatmentLegend$ = this.mapConfigState.showTreatmentLegend$;
  treatmentActionsUsed$ = this.treatedStandsState.treatmentActionsUsed$;

  close() {
    this.dialogRef.close();
  }
}
