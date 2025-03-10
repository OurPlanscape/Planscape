import { Component, EventEmitter, Output } from '@angular/core';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-map-zoom-control',
  standalone: true,
  imports: [ControlComponent, MatIconModule],
  templateUrl: './map-zoom-control.component.html',
  styleUrl: './map-zoom-control.component.scss'
})
export class MapZoomControlComponent {
  @Output() zoomIn = new EventEmitter<string>();
  @Output() zoomOut = new EventEmitter<string>();

  handleZoomIn() {
    this.zoomIn.emit();
  }

  handleZoomOut() {
    this.zoomOut.emit();

  }


}
