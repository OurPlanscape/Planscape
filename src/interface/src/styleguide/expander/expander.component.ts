import { Component, HostBinding, Input } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'sg-expander',
  standalone: true,
  imports: [MatExpansionModule, MatIconModule, NgIf, NgFor],
  templateUrl: './expander.component.html',
  styleUrl: './expander.component.scss',
})
export class ExpanderComponent {
  @Input() title = 'Hello, World!';
  @Input() standCount: number = 0;
  @Input() selected = false;

  @Input() rxDetails = [
    { name: 'Moderate mastication & Pile burn', year: 0 },
    { name: 'Prescribed fire', year: 0 },
  ];
  openState = false;

  toggleState() {
    this.openState = !this.openState;
  }

  @HostBinding('class.selected')
  get isSelected() {
    return this.selected;
  }
}
