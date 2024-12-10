import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModalComponent } from '@styleguide';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { FormsModule } from '@angular/forms';
import { ImpactsProjectArea } from '../direct-impacts/direct-impacts.component';

@Component({
  selector: 'app-expanded-change-over-time-chart',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    MatSlideToggleModule,
    ModalComponent,
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
    public dialogRef: MatDialogRef<ExpandedChangeOverTimeChartComponent>
  ) {}

  // TODO: Remove this example data
  selectedChartProjectArea: ImpactsProjectArea = {
    project_area_id: 5,
    project_area_name: 'replaceme',
  };

  setChartProjectArea() {
    this.directImpactsStateService.setProjectAreaForChanges(
      this.selectedChartProjectArea
    );
  }

  availableProjectAreas$ =
    this.directImpactsStateService.availableProjectAreas$;

  close() {
    this.dialogRef.close();
  }
}
