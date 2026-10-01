import { Component } from '@angular/core';
import { FeaturesModule } from '@features/features.module';
import { BaseLayersPanelComponent } from '@base-layers/base-layers-panel/base-layers-panel.component';
import { LegacyBaseLayersComponent } from '@base-layers/legacy-base-layers/legacy-base-layers.component';

@Component({
  selector: 'app-base-layers',
  standalone: true,
  imports: [
    FeaturesModule,
    BaseLayersPanelComponent,
    LegacyBaseLayersComponent,
  ],
  templateUrl: './base-layers.component.html',
  styleUrl: './base-layers.component.scss',
})
export class BaseLayersComponent {}
