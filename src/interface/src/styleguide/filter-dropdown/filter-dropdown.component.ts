import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
export type FilterMenuType = 'standard' | 'checkbox';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sg-filter-dropdown',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule],
  templateUrl: './filter-dropdown.component.html',
  styleUrls: ['./filter-dropdown.component.scss'],
})
export class FilterDropdownComponent {
  selectedItems: string[] = [];
  @Input() leadingIcon: string = '';
  @Input() disabled: boolean = false;
  @Input() menuType!: FilterMenuType;
  @Input() menuLabel!: string;
  @Input() menuItems!: string[];
  @Input() activeFilter = false;
  @Output() updateSelection = new EventEmitter();

  hasSelections(): boolean {
    return this.selectedItems.length > 0;
  }

  showCount(): boolean {
    return this.selectedItems.length > 1;
  }

  isInSelection(term: string): boolean {
    return this.selectedItems.includes(term);
  }

  toggleSelection(item: string) {
    console.log('selected ', item);
    if (!this.selectedItems.includes(item)) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter((e) => e !== item);
    }
  }

  selectionText(): string {
    if (this.selectedItems.length > 0) {
      return `${this.menuLabel} : ${this.selectedItems.join(', ')}`;
    }
    return this.menuLabel;
  }
}
