import { Component, Input } from '@angular/core';

@Component({
  selector: 'sg-sequence-icon',
  standalone: true,
  imports: [],
  templateUrl: './sequence-icon.component.html',
  styleUrl: './sequence-icon.component.scss',
})
export class SequenceIconComponent {
  @Input() sequenceNum: number | null = null;

  readonly sequenceIcons: Record<number, string> = {
    1: 'sequence_1.svg',
    2: 'sequence_2.svg',
    3: 'sequence_3.svg',
    4: 'sequence_4.svg',
    5: 'sequence_5.svg',
    6: 'sequence_6.svg',
    7: 'sequence_7.svg',
    8: 'sequence_8.svg',
  };

  iconName() {
    if (this.sequenceNum !== null) {
      return this.sequenceIcons[this.sequenceNum];
    }
    return 'treatment_none.svg';
  }
}
