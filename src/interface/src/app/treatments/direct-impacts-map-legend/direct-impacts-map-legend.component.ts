import { Component } from '@angular/core';
import { SLOT_PALETTES } from '../metrics';
import { AsyncPipe, NgForOf, NgIf, NgStyle } from '@angular/common';
import { TreatmentsState } from '../treatments.state';
import { map } from 'rxjs';

@Component({
  selector: 'app-direct-impacts-map-legend',
  standalone: true,
  imports: [AsyncPipe, NgStyle, NgForOf, NgIf],
  templateUrl: './direct-impacts-map-legend.component.html',
  styleUrl: './direct-impacts-map-legend.component.scss',
})
export class DirectImpactsMapLegendComponent {
  constructor(private treatmentsState: TreatmentsState) {}

  readonly SLOT_PALETTES = SLOT_PALETTES;
  readonly steps = ['100%', '50%', '0% (No change)', '-50%', '-100%'];
  readonly activeSlot$ = this.treatmentsState.activeMetric$.pipe(
    map((mapMetric) => mapMetric.slot)
  );
}
