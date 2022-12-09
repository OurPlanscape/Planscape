import { Component, Input } from '@angular/core';
import { DataLayerConfig } from 'src/app/types';

@Component({
  selector: 'app-layer-info-card',
  templateUrl: './layer-info-card.component.html',
  styleUrls: ['./layer-info-card.component.scss']
})
export class LayerInfoCardComponent {

  @Input() dataLayerConfig!: DataLayerConfig | null;

}
