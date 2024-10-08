import { Component, Input } from '@angular/core';
import { PrescriptionSequenceAction } from '../../app/treatments/prescriptions';
@Component({
  selector: 'sg-sequence-icon',
  standalone: true,
  imports: [],
  templateUrl: './sequence-icon.component.html',
  styleUrl: './sequence-icon.component.scss',
})
export class SequenceIconComponent {
  @Input() action?: PrescriptionSequenceAction | string;

  readonly sequenceIcons: Record<PrescriptionSequenceAction, string> = {
    MODERATE_THINNING_BURN_PLUS_RX_FIRE: 'sequence_1.svg',
    MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: 'sequence_2.svg',
    HEAVY_THINNING_BURN_PLUS_RX_FIRE: 'sequence_3.svg',
    HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: 'sequence_4.svg',
    RX_FIRE_PLUS_RX_FIRE: 'sequence_5.svg',
    MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: 'sequence_6.svg',
    HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: 'sequence_7.svg',
    MODERATE_MASTICATION_PLUS_RX_FIRE: 'sequence_8.svg',
  };

  iconName() {
    if (this.action !== undefined) {
      return this.sequenceIcons[this.action as PrescriptionSequenceAction];
    }
    return 'treatment_none.svg';
  }
}
