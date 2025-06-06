import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MapConfigState } from '../map-config.state';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { DrawState } from '../explore-map/explore-map.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-map-drawing-toolbox',
  standalone: true,
  imports: [AsyncPipe, ControlComponent, MatIconModule, NgClass, NgIf],
  templateUrl: './map-drawing-toolbox.component.html',
  styleUrl: './map-drawing-toolbox.component.scss',
})
export class MapDrawingToolboxComponent {
  constructor(private mapConfigState: MapConfigState) {}

  @Output() setPolygonMode = new EventEmitter();
  @Output() setSelectMode = new EventEmitter();
  @Output() sendClearRequest = new EventEmitter();
  @Input() drawState$!: Observable<DrawState>;

  drawingModeEnabled$ = this.mapConfigState.drawingModeEnabled$;

  handlePolygonButton() {
    this.setPolygonMode.emit();
  }
  handleSelectButton() {
    this.setSelectMode.emit();
  }
  handleTrashButton() {
    this.sendClearRequest.emit();
  }
}
