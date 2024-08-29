import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';

export type OptionType = { value: string | number; text: string } | string;

@Component({
  selector: 'sg-expander-section',
  standalone: true,
  imports: [NgForOf, NgIf, NgClass],
  templateUrl: './expander-section.component.html',
  styleUrl: './expander-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpanderSectionComponent<T extends OptionType> {
  @Input() isOpen?: boolean;
  @Input() title: string = '';
  @Input() groupName = '';
  @Input() options: T[] = [];
  @Input() defaultOption?: T;
  @Output() optionSelected = new EventEmitter<T>();

  getValue(item: OptionType) {
    if (typeof item === 'string') {
      return item;
    }
    return item.value;
  }

  getText(item: OptionType) {
    if (typeof item === 'string') {
      return item;
    }
    return item.text;
  }
}
