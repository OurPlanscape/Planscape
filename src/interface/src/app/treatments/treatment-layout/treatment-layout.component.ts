import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';

@Component({
  selector: 'app-treatment-layout',
  standalone: true,
  imports: [RouterOutlet, TreatmentMapComponent],
  templateUrl: './treatment-layout.component.html',
  styleUrl: './treatment-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentLayoutComponent {
  constructor() {}
}
