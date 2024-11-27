import { Component, EventEmitter, Output } from '@angular/core';
import { ControlComponent } from '@maplibre/ngx-maplibre-gl';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-action-button',
  standalone: true,
  imports: [ControlComponent, MatIconModule, MatTooltipModule],
  templateUrl: './map-actionbutton.component.html',
  styleUrl: './map-actionbutton.component.scss',
})
export class MapActionButtonComponent {
  constructor() {}
  @Output() clickedActionButton = new EventEmitter();

  handleClick() {
    this.clickedActionButton.emit();
  }
}
