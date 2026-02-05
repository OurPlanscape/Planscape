import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapConfigState } from '@app/maplibre-map/map-config.state';

@Component({
  selector: 'app-rx-selection-toggle',
  standalone: true,
  imports: [AsyncPipe, MatIconModule, MatTooltipModule, NgIf, NgClass],
  templateUrl: './rx-selection-toggle.component.html',
  styleUrl: './rx-selection-toggle.component.scss',
})
export class RxSelectionToggleComponent {
  constructor(private mapConfigState: MapConfigState) {}

  standSelectionEnabled$ = this.mapConfigState.standSelectionEnabled$;

  toggleRxSelection() {
    this.mapConfigState.setStandSelectionEnabled(true);
  }

  togglePan() {
    this.mapConfigState.setStandSelectionEnabled(false);
  }
}
