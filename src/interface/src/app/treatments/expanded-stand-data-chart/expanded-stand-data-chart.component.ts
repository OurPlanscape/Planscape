import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModalComponent } from '@styleguide';
import { StandDataChartComponent } from '../stand-data-chart/stand-data-chart.component';
import { DirectImpactsStateService } from '../direct-impacts.state.service';

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
  ],
  templateUrl: './expanded-stand-data-chart.component.html',
  styleUrl: './expanded-stand-data-chart.component.scss',
})
export class ExpandedStandDataChartComponent {
  constructor(private directImpactsStateService: DirectImpactsStateService) {}

  activeStand$ = this.directImpactsStateService.activeStand$;
}
