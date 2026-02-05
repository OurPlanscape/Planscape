import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NgForOf, NgIf } from '@angular/common';
import { ButtonComponent } from '..';

// Accepts anything with a name attribute
interface HasName {
  name: string;
}

@Component({
  selector: 'sg-chip-selector',
  standalone: true,
  imports: [ButtonComponent, MatChipsModule, MatIconModule, NgForOf, NgIf],
  templateUrl: './chip-selector.component.html',
  styleUrl: './chip-selector.component.scss',
})
export class ChipSelectorComponent<T extends HasName> {
  @Input() items: T[] = [];
  @Input() maxCollapsedItems = 4;

  @Output() addItem = new EventEmitter<T>();
  @Output() removeItem = new EventEmitter<T>();

  expanded: boolean = false;

  get displayedItems() {
    if (this.expanded) {
      return this.items;
    } else {
      return this.items.slice(0, this.maxCollapsedItems);
    }
  }

  handleRemove(item: T) {
    this.removeItem.emit(item);
  }

  expand() {
    this.expanded = true;
  }

  collapse() {
    this.expanded = false;
  }

  get hiddenCount() {
    return this.items.length - this.maxCollapsedItems;
  }
}
