import { Component, EventEmitter, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapConfigState } from '../map-config.state';

@Component({
  selector: 'app-explore-modes-selection-toggle',
  standalone: true,
  imports: [
    AsyncPipe,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    NgClass,
    NgIf,
  ],
  templateUrl: './explore-modes-toggle.component.html',
  styleUrl: './explore-modes-toggle.component.scss',
})
export class ExploreModesToggleComponent {
  @Output() scenarioUpload = new EventEmitter<void>();
  drawModeEnabled$ = this.mapConfigState.drawingModeEnabled$;

  constructor(private mapConfigState: MapConfigState) {}

  toggleDrawing() {
    this.mapConfigState.toggleDrawingMode();
  }

  cancelDrawing() {
    // TODO: handle this with mapconfigstate
  }

  saveDrawing() {
    // TODO: handle this with mapconfigstate
  }

  clickedUpload() {
    this.scenarioUpload.emit();
  }
}
