import { Component } from '@angular/core';
import { MultiMapConfigState } from '../multi-map-config.state';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MapConfigState } from '../map-config.state';

@Component({
  selector: 'app-multi-map-control',
  standalone: true,
  imports: [AsyncPipe, NgIf, NgClass],
  templateUrl: './multi-map-control.component.html',
  styleUrl: './multi-map-control.component.scss',
})
export class MultiMapControlComponent {
  layoutMode$ = this.multiMapConfigState.layoutMode$;

  constructor(
    private multiMapConfigState: MultiMapConfigState,
    private mapConfigState: MapConfigState
  ) {}

  // we disable this control when we're in drawing mode
  mapInteractionMode$ = this.mapConfigState.mapInteractionMode$;

  setLayoutMode(view: 1 | 2 | 4) {
    this.multiMapConfigState.setLayoutMode(view);
  }
}
