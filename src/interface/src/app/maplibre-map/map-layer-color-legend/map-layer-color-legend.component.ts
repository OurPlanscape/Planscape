import { Component, Input, OnInit } from '@angular/core';
import { NgIf, NgFor, NgStyle } from '@angular/common';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Map as MapLibreMap, ControlPosition } from 'maplibre-gl';
import { LayerStyleEntry } from '@types';
import chroma from 'chroma-js';

type GradientEntry = {
  colorHex: string;
  label: string;
};

@Component({
  selector: 'app-map-layer-color-legend',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgStyle,
    ControlComponent,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './map-layer-color-legend.component.html',
  styleUrl: './map-layer-color-legend.component.scss',
})
export class MapLayerColorLegendComponent implements OnInit {
  @Input() controlsPosition: ControlPosition = 'top-left';
  @Input() mapLibreMap!: MapLibreMap;
  @Input() title: string = '';
  @Input() colorDetails: LayerStyleEntry[] = [];
  @Input() rangeDetails: GradientEntry[] = [];

  @Input() isRamp = false;

  gradientStyle = '';

  ngOnInit() {
    const gradient = chroma
      .scale(this.rangeDetails.map((c) => c.colorHex))
      .mode('lab')
      .colors(10);
    this.gradientStyle = `linear-gradient(to bottom, ${gradient.join(', ')})`;
  }
}
