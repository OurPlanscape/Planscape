import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [ControlComponent, MatIconModule, MatTooltipModule, NgIf],
  templateUrl: './map-action-button.component.html',
  styleUrl: './map-action-button.component.scss',
})
export class MapActionButtonComponent {
  constructor() {}

  @Input() tooltipContent: string = '';
  @Input() icon: 'layers' | 'legend-toggle' = 'layers';
  @Output() clickedActionButton = new EventEmitter();

  handleClick() {
    this.clickedActionButton.emit();
  }
}
