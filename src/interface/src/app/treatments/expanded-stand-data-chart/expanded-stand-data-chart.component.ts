import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModalComponent } from '@styleguide';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { map } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { ExpandedPanelComponent } from '../../../styleguide/expanded-panel/expanded-panel.component';

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
  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    public dialogRef: MatDialogRef<ExpandedStandDataChartComponent>
  ) {}

  standChartPanelTitle$ = this.directImpactsStateService.activeStand$.pipe(
    map((activeStand) => {
      if (!activeStand) {
        return 'Stand Level Data Unavailable';
      }
      return `${activeStand.properties['project_area_name']}, Stand ${activeStand.properties['id']}`;
    })
  );

  close() {
    this.dialogRef.close();
  }
}
