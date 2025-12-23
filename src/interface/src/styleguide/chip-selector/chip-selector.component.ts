import { Component, EventEmitter, Input, Output } from '@angular/core';
import {MatChipsModule} from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NgForOf } from '@angular/common';

@Component({
  selector: 'sg-chip-selector',
  standalone: true,
  imports: [MatChipsModule, MatIconModule, NgForOf],
  templateUrl: './chip-selector.component.html',
  styleUrl: './chip-selector.component.scss'
})
export class ChipSelectorComponent {

  @Input() items : string[] = ['something', 'another thing', 'a third thing',
    'one more thing', 'yet another thing', 'just a thing like the others'
  ];

  MAX_ITEMS_TO_DISPLAY = 4;

  @Output() addItem = new EventEmitter<string>();
  @Output() removeItem = new EventEmitter<string>();

  expanded:boolean = false;

  handleRemove(item : string ) {
    console.log('wants to remove:', item);
    this.removeItem.emit(item);
  }

  expand() {
    this.expanded = true;
  }

  collapse() {
    this.expanded = false;
  }

}
