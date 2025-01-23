import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ModalComponent } from '@styleguide';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { MatDialogRef } from '@angular/material/dialog';

import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentLegendComponent } from '../treatment-legend/treatment-legend.component';
import { ExpandedPanelComponent } from '../../../styleguide/expanded-panel/expanded-panel.component';
import { MapConfigState } from '../treatment-map/map-config.state';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';

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
