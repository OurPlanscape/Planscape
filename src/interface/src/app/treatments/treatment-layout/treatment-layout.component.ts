import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { TreatmentsState } from '../treatments.state';

@Component({
  selector: 'app-treatment-layout',
  standalone: true,
  imports: [RouterOutlet, TreatmentMapComponent],
  templateUrl: './treatment-layout.component.html',
  styleUrl: './treatment-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentLayoutComponent implements OnDestroy {
  constructor(private treatmentsState: TreatmentsState) {}

  ngOnDestroy(): void {
    this.treatmentsState.reset();
  }
}
