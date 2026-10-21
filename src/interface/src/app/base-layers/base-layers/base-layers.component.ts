import { Component } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { FeaturesModule } from '@features/features.module';
import { BaseLayersPanelComponent } from '@base-layers/base-layers-panel/base-layers-panel.component';
import { LegacyBaseLayersComponent } from '@base-layers/legacy-base-layers/legacy-base-layers.component';
import { MapModuleService } from '@services/map-module.service';
import { ButtonComponent } from '@styleguide';
import { MessageCardComponent } from '@styleguide/message-card/message-card.component';

@Component({
  selector: 'app-base-layers',
  standalone: true,
  imports: [
    AsyncPipe,
    ButtonComponent,
    MessageCardComponent,
    FeaturesModule,
    BaseLayersPanelComponent,
    LegacyBaseLayersComponent,
    NgIf,
  ],
  templateUrl: './base-layers.component.html',
  styleUrl: './base-layers.component.scss',
})
export class BaseLayersComponent {
  loadError$ = this.mapModuleService.loadError$;

  constructor(private mapModuleService: MapModuleService) {}

  retryLoad() {
    this.mapModuleService.retryLoadMapModule();
  }
}
