import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'sg-expander',
  standalone: true,
  imports: [MatExpansionModule, MatIconModule, NgIf],
  templateUrl: './expander.component.html',
  styleUrl: './expander.component.scss',
})
export class ExpanderComponent {
  @Input() title = 'Hello, World!';
  openState = false;

  toggleState() {
    this.openState = !this.openState;
  }
}
