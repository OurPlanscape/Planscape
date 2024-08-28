import { Component, Input } from '@angular/core';

// TODO: decide if we want to create a global list of treatment types that map to colors, instead...
export type TreatmentIconColor =
  | 'none'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'yellow'
  | 'junglegreen'
  | 'limegreen'
  | 'red'
  | 'brown'
  | 'pink';

@Component({
  selector: 'sg-treatment-type-icon',
  standalone: true,
  imports: [],
  templateUrl: './treatment-type-icon.component.html',
  styleUrl: './treatment-type-icon.component.scss',
})
export class TreatmentTypeIconComponent {
  @Input() treatmentColor: TreatmentIconColor | null = null;

  //TODO: consider dynamically updating the fill for SVGs, instead
  readonly treatmentIcons: Record<TreatmentIconColor, string> = {
    none: 'treatment_none.svg',
    blue: 'treatment_blue.svg',
    purple: 'treatment_purple.svg',
    orange: 'treatment_orange.svg',
    yellow: 'treatment_yellow.svg',
    junglegreen: 'treatment_junglegreen.svg',
    limegreen: 'treatment_limegreen.svg',
    red: 'treatment_red.svg',
    brown: 'treatment_brown.svg',
    pink: 'treatment_pink.svg',
  };

  iconName() {
    if (this.treatmentColor !== null) {
      return this.treatmentIcons[this.treatmentColor];
    }
    return 'treatment_none';
  }
}
