import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModalComponent } from '@styleguide';
import { ChangeOverTimeChartComponent } from '../change-over-time-chart/change-over-time-chart.component';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-expanded-change-over-time-chart',
  standalone: true,
  imports: [
    AsyncPipe,
    MatSlideToggleModule,
    ModalComponent,
    NgForOf,
    NgIf,
    ChangeOverTimeChartComponent,
  ],
  templateUrl: './expanded-change-over-time-chart.component.html',
  styleUrl: './expanded-change-over-time-chart.component.scss',
})
export class ExpandedChangeOverTimeChartComponent {
  constructor(
    // private directImpactsStateService: DirectImpactsStateService,
    public dialogRef: MatDialogRef<ExpandedChangeOverTimeChartComponent>
  ) {}

  close() {
    this.dialogRef.close();
  }
}
