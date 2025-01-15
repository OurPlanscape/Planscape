import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { FormsModule } from '@angular/forms';
import { TreatmentsState } from '../treatments.state';
import { map } from 'rxjs';
import { TreatmentProjectArea } from '@types';
import { ExpandedPanelComponent } from '../../../styleguide/expanded-panel/expanded-panel.component';

@Component({
  selector: 'app-expanded-change-over-time-chart',
  standalone: true,
  imports: [
    AsyncPipe,
    ExpandedPanelComponent,
    FormsModule,
    MatSlideToggleModule,
    MatSelectModule,
    NgForOf,
    NgIf,
    ChangeOverTimeChartComponent,
  ],
  templateUrl: './expanded-change-over-time-chart.component.html',
  styleUrl: './expanded-change-over-time-chart.component.scss',
})
export class ExpandedChangeOverTimeChartComponent {
  constructor(
    private directImpactsStateService: DirectImpactsStateService,
    private treatmentsState: TreatmentsState,
    public dialogRef: MatDialogRef<ExpandedChangeOverTimeChartComponent>
  ) {}
  selectedChartProjectArea$ =
    this.directImpactsStateService.selectedProjectArea$;

  availableProjectAreas$ = this.treatmentsState.summary$.pipe(
    map((summary) => {
      return summary?.project_areas;
    })
  );

  setChartProjectArea(e: TreatmentProjectArea) {
    this.directImpactsStateService.setProjectAreaForChanges(e);
  }

  close() {
    this.dialogRef.close();
  }
}
