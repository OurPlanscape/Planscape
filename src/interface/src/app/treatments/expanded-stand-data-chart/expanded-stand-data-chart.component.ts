import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModalComponent } from '@styleguide';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { MatDialogRef } from '@angular/material/dialog';
import { ExpandedPanelComponent } from '../../../styleguide/expanded-panel/expanded-panel.component';
import { MapGeoJSONFeature } from 'maplibre-gl';
import { standIsForested } from '../stands';

@Component({
  selector: 'app-expanded-stand-data-chart',
  standalone: true,
  imports: [
    AsyncPipe,
    MatSlideToggleModule,
    ModalComponent,
    NgForOf,
    NgIf,
    StandDataChartComponent,
    ExpandedPanelComponent,
  ],
  templateUrl: './expanded-stand-data-chart.component.html',
  styleUrl: './expanded-stand-data-chart.component.scss',
})
export class ExpandedStandDataChartComponent {
  activeStand$ = this.directImpactsStateService.activeStand$;

  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    public dialogRef: MatDialogRef<ExpandedStandDataChartComponent>
  ) {}

  standChartTitle(standFeature: MapGeoJSONFeature) {
    if (standIsForested(standFeature)) {
      return 'Percentage Change From Baseline';
    } else {
      return 'Direct Effects';
    }
  }

  forestedLabel(standFeature: MapGeoJSONFeature) {
    if (standIsForested(standFeature)) {
      return `(Forested Stand)`;
    } else return `(Non-forested Stand)`;
  }

  close() {
    this.dialogRef.close();
  }
}
