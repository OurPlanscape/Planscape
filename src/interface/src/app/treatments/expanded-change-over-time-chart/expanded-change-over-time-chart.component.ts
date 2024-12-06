import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModalComponent } from '@styleguide';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { DirectImpactsStateService } from '../direct-impacts.state.service';
import { FormsModule } from '@angular/forms';

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

  // TODO: Remove example data
  selectedChartProjectArea = { id: '5', name: 'replaceme' };

  setChartProjectArea() {
    this.directImpactsStateService.setProjectAreaForChanges(
      this.selectedChartProjectArea.id
    );
  }

  availableProjectAreas$ =
    this.directImpactsStateService.availableProjectAreas$;

  close() {
    this.dialogRef.close();
  }
}
