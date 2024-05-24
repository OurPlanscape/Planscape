import { Component, EventEmitter, Output } from '@angular/core';
import * as L from 'leaflet';

@Component({
  template: '<div></div>',
})
export class MapLayerControlComponent extends L.Control {
  constructor() {
    super({ position: 'topleft' }); // Set the position (optional)
  }
  @Output() layerClicked = new EventEmitter<void>();

  override onAdd(map: L.Map) {
    const container = L.DomUtil.create('div', 'base-layer-control');
    const icon = L.DomUtil.create(
      'span',
      'material-symbols-outlined layer-icon'
    );
    icon.textContent = 'layers';
    container.append(icon);
    container.addEventListener('click', () => this.handleClick());
    return container;
  }

  handleClick() {
    this.layerClicked.emit();
  }
}
