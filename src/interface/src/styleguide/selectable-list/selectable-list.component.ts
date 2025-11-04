import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForOf } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ButtonComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';

interface Item {
  id: number;
  name: string;
  color: string;
}

@Component({
  selector: 'sg-selectable-list',
  standalone: true,
  imports: [NgForOf, MatCheckboxModule, ButtonComponent, MatIconModule],
  templateUrl: './selectable-list.component.html',
  styleUrl: './selectable-list.component.scss',
})
export class SelectableListComponent<T extends Item> {
  @Input() items: T[] = [];
  // next, provide selected items

  /*
   Emits when an item is selected
   */
  @Output() itemSelected = new EventEmitter<T>();
  @Output() itemsSelected = new EventEmitter<T[]>();

  selectItem(item: T) {
    console.log('selected item', item);
  }
}
