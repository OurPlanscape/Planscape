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

  // TODO: waiting to hear if, when we're in drawing mode, whether we should disable these
  // layout view buttons, OR perhaps set drawingMode as disabled if someone clicks these.
  $drawingMode = this.mapConfigState.drawingModeEnabled$;

  setLayoutMode(view: 1 | 2 | 4) {
    this.multiMapConfigState.setLayoutMode(view);
  }
}
