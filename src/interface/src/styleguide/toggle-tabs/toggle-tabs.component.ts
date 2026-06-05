import { NgFor } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  MatButtonToggleChange,
  MatButtonToggleModule,
} from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

export interface ToggleButtonsConfig {
  name: string;
  icon: string;
  value: string;
}

@Component({
  selector: 'sg-toggle-tabs',
  standalone: true,
  imports: [MatButtonToggleModule, MatIconModule, MatTabsModule, NgFor],
  templateUrl: './toggle-tabs.component.html',
  styleUrl: './toggle-tabs.component.scss',
})
/** Displays a series of buttons with one selectable option */
export class ToggleTabsComponent {
  /** An array of buttons to display, as an object of strings: 
   [{name: string; icon: string; value: string;}...] */
  @Input() buttons: ToggleButtonsConfig[] = [];

  /** The default selected value or null */
  @Input() defaultSelection: string | null = null;

  /** Emits the selected value */
  @Output() emitSelection = new EventEmitter<string>();

  handleSelection(toggleSelection: MatButtonToggleChange) {
    this.emitSelection.emit(toggleSelection.value);
  }
}
