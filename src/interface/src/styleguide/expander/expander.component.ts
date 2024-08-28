import { Component, Input } from '@angular/core';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

export interface rxType {
  name: string;
  year: number;
}
@Component({
  selector: 'sg-expander',
  standalone: true,
  imports: [MatExpansionModule, MatIconModule, NgClass, NgIf, NgFor],
  templateUrl: './expander.component.html',
  styleUrl: './expander.component.scss',
})
/**
 * Expander component
 * A component to be used in the treatments panel to show treatment details
 */
export class ExpanderComponent {
  /**
   * The title text
   */
  @Input() title = '';
  /**
   * A number or ratio indicating stand count
   */
  @Input() standCount: string = '0';
  /**
   * Whether or not this is the selected expander
   */
  @Input() selected = false;
  /**
   * Total number of acres
   */
  @Input() totalAcres = 100;
  /**
   * A list of prescriptions {name: string, year: number}
   */
  @Input() rxDetails: rxType[] = [];
  openState = false;

  toggleState() {
    this.openState = !this.openState;
  }

  // TODO: solve HostBinding...
  get isSelected() {
    return this.selected;
  }
}
