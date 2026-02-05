import { Component } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { DrawService } from '@app/maplibre-map/draw.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-map-drawing-toolbox',
  standalone: true,
  imports: [
    AsyncPipe,
    ControlComponent,
    MatIconModule,
    MatTooltipModule,
    NgClass,
    NgIf,
  ],
  templateUrl: './map-drawing-toolbox.component.html',
  styleUrl: './map-drawing-toolbox.component.scss',
})
export class MapDrawingToolboxComponent {
  constructor(private drawService: DrawService) {}

  currentDrawingMode$ = this.drawService.currentDrawingMode$;
  selectedFeatureId$ = this.drawService.selectedFeatureId$;

  handlePolygonButton() {
    this.drawService.setMode('polygon');
  }
  handleSelectButton() {
    this.drawService.setMode('select');
  }
  handleDeleteFeature() {
    this.drawService.deleteSelectedFeature();
  }
  handleTrashButton() {
    this.drawService.clearFeatures();
  }
}
