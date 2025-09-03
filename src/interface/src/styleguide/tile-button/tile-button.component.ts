import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sg-tile-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tile-button.component.html',
  styleUrls: ['./tile-button.component.scss'],
})
export class TileButtonComponent {
  @Input() backgroundImage: string = '';
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() disabled: boolean = false;
  @Input() size: 'md' = 'md';
  @Output() tileClick = new EventEmitter<void>();

  handleClick(event: Event): void {
    if (!this.disabled) {
      event.stopPropagation();
      this.tileClick.emit();
    }
  }
}
