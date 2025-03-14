import { Component, Input } from '@angular/core';
import { PrescriptionSingleAction } from '../../app/treatments/prescriptions';

@Component({
  selector: 'sg-treatment-type-icon',
  standalone: true,
  imports: [],
  templateUrl: './treatment-type-icon.component.html',
  styleUrl: './treatment-type-icon.component.scss',
})
export class TreatmentTypeIconComponent {
  @Input() treatment: string | null = null;

  readonly treatmentIcons: Record<PrescriptionSingleAction, string> = {
    MODERATE_THINNING_BIOMASS: 'treatment_blue.svg',
    HEAVY_THINNING_BIOMASS: 'treatment_purple.svg',
    MODERATE_THINNING_BURN: 'treatment_orange.svg',
    HEAVY_THINNING_BURN: 'treatment_light_orange.svg',
    MODERATE_MASTICATION: 'treatment_junglegreen.svg',
    HEAVY_MASTICATION: 'treatment_limegreen.svg',
    RX_FIRE: 'treatment_red.svg',
    HEAVY_THINNING_RX_FIRE: 'treatment_brown.svg',
    MASTICATION_RX_FIRE: 'treatment_pink.svg',
  };

  iconName() {
    const treatmentType = this.treatment as PrescriptionSingleAction;
    if (this.treatment !== null) {
      return this.treatmentIcons[treatmentType];
    }
    return 'treatment_none.svg';
  }
}
