import { CommonModule } from '@angular/common';
import {
  Component,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Output,
  ViewContainerRef,
} from '@angular/core';
import * as L from 'leaflet';
import { OpacityControlTemplateComponent } from './opacity-control-template.component';

@Component({
  standalone: true,
  template: '',
  styleUrls: [],
  imports: [CommonModule, OpacityControlTemplateComponent],
})
export class OpacityControlComponent extends L.Control {
  private injector = inject(EnvironmentInjector);
  private viewContainerRef: ViewContainerRef = inject(ViewContainerRef);

  constructor() {
    super({ position: 'topleft' });
  }

  @Output() opacityChanged = new EventEmitter<number>();

  override onAdd(map: L.Map) {
    const container = L.DomUtil.create('div', 'opacity-container');
    // Deactivating the propagation for drag and click so we can move the slider without problems
    L.DomEvent.disableClickPropagation(container);
    // Injecting the component after the container was added to the map
    this.injectAuxComponent(container);
    return container;
  }

  injectAuxComponent(container: HTMLElement) {
    // We can use any component here
    const componentRef = this.viewContainerRef.createComponent(
      OpacityControlTemplateComponent,
      {
        injector: this.injector,
      }
    );

    componentRef.instance.valueChange.subscribe((opacity: number) => {
      this.handleOpacityChange(opacity);
    });

    // Adding the component into the Leaflet container
    container.appendChild(componentRef.location.nativeElement);
  }

  handleOpacityChange(opacity: number) {
    this.opacityChanged.emit(opacity);
  }
}
