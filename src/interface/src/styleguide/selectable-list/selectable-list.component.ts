import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass, NgForOf, NgIf, NgStyle } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ButtonComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

interface Item {
  id: number;
  name: string;
}

/** Displays a list of items, with the option to select and or toggle view on each.
 *
 * Items can be of any type as long as they extend from a basic `Item` interface:
 *
 * ```ts
 * interface Item {
 *   id: number;
 *   name: string;
 * }
 * ```
 *
 *
 * Has `selectedItemsChanged` and `viewedItemsChanged` event emitters to listen for to changes.
 *
 * */
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
    NgStyle,
    NgIf,
  ],
  templateUrl: './selectable-list.component.html',
  styleUrl: './selectable-list.component.scss',
})
export class SelectableListComponent<T extends Item> {
  /** @ignore - default legend color */
  defaultColor = 'transparent';

  /** all the items */
  @Input() items: T[] = [];

  /** the selected items */
  @Input() selectedItems: T[] = [];
  /* the view items */
  @Input() viewedItems: T[] = [];

  /** the property to look up color for the legend */
  @Input() colorPath?: string;

  /** Emits when an item is selected */
  @Output() selectedItemsChanged = new EventEmitter<T[]>();

  /** Emits when an item is viewed */
  @Output() viewedItemsChanged = new EventEmitter<T[]>();

  /** @ignore */
  selectItem(item: T) {
    // // toggle if same item
    const isSelected = this.selectedItems.includes(item);

    this.selectedItems = isSelected
      ? this.selectedItems.filter((i) => i !== item)
      : [...this.selectedItems, item];

    this.selectedItemsChanged.emit(this.selectedItems);
  }

  /** @ignore */
  viewItem(item: T) {
    // // toggle if same item
    const isSelected = this.viewedItems.includes(item);
    this.viewedItems = isSelected
      ? this.viewedItems.filter((i) => i !== item)
      : [...this.viewedItems, item];

    this.viewedItemsChanged.emit(this.viewedItems);
  }

  /** @ignore */
  isSelected(item: T) {
    return this.selectedItems.some((i) => i.id === item.id);
  }

  /** @ignore */
  isViewed(item: T) {
    return this.viewedItems.some((i) => i.id === item.id);
  }

  /** @ignore */
  getColor(item: any): string {
    if (!this.colorPath) return this.defaultColor;

    const val = this.colorPath.split('.').reduce((v, k) => v?.[k], item);

    if (val == null) {
      console.error(
        `SelectableListComponent: colorPath "${this.colorPath}" not found`,
        item
      );
      return this.defaultColor;
    }

    return val;
  }
}
