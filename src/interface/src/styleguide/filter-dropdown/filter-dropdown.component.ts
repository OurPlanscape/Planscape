import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sg-filter-dropdown',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule],
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
})
export class FilterDropdownComponent {
  selections: string[] = [];

  @Input() menuName: string = '';
  @Input() menuLabel: string = 'Filter';
  @Output() updateSelection = new EventEmitter();

  getSelections() {
    if (this.selections.length > 0) {
      return this.selections.join(', ');
    }
    return this.menuLabel;
  }
}
