import { Component, Input } from '@angular/core';
// import { TreatmentStatus } from '@types';
// import filled_hex from '../../assets/svg/icons/treatment-types/treatment_filled.svg';

@Component({
  selector: 'sg-treatment-type-icon',
  standalone: true,
  imports: [],
  templateUrl: './treatment-type-icon.component.html',
  styleUrl: './treatment-type-icon.component.scss',
})
export class TreatmentTypeIconComponent {
  @Input() type = '';

  //   @HostBinding('class.disabled')
  //   get isDisabled() {
  //     return this.status === 'RUNNING';
  //   }

  //   @HostListener('click')
  //   viewTreatment() {
  //     this.view.emit();
  //   }

  //   stopEventPropagation(event: Event) {
  //     event.stopPropagation();
  //     return false;
  //   }
}
