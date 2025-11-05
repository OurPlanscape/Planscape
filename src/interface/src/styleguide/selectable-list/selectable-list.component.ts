import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgForOf } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ButtonComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Item {
  id: number;
  name: string;
  color: string;
}

@Component({
  selector: 'sg-selectable-list',
  standalone: true,
  imports: [
    NgForOf,
    MatCheckboxModule,
    ButtonComponent,
    MatIconModule,
    NgClass,
    MatButtonModule,
  ],
  templateUrl: './selectable-list.component.html',
  styleUrl: './selectable-list.component.scss',
})
export class SelectableListComponent<T extends Item> {
  /* all the items */
  @Input() items: T[] = [];

  /* the selected items */
  @Input() selectedItems: T[] = [];
  /* the view items */
  @Input() viewedItems: T[] = [];

  /* Emits when an item is selected */
  @Output() selectedItemsChanged = new EventEmitter<T[]>();
  /* Emits when an item is viewed */
  @Output() viewedItemsChanged = new EventEmitter<T[]>();

  selectItem(item: T) {
    // // toggle if same item
    const isSelected = this.selectedItems.includes(item);

    this.selectedItems = isSelected
      ? this.selectedItems.filter((i) => i !== item)
      : [...this.selectedItems, item];

    this.selectedItemsChanged.emit(this.selectedItems);
  }

  viewItem(item: T) {
    // // toggle if same item
    const isSelected = this.viewedItems.includes(item);
    this.viewedItems = isSelected
      ? this.viewedItems.filter((i) => i !== item)
      : [...this.viewedItems, item];

    this.viewedItemsChanged.emit(this.viewedItems);
  }

  isSelected(item: T) {
    return this.selectedItems.some((i) => i.id === item.id);
  }

  isViewed(item: T) {
    return this.viewedItems.some((i) => i.id === item.id);
  }
}
