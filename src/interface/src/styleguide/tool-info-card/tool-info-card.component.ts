import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'sg-tool-info-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, NgIf],
  templateUrl: './tool-info-card.component.html',
  styleUrl: './tool-info-card.component.scss',
})
export class ToolInfoCardComponent {
  @Input() title = '';
  @Input() mainImagePath: string | null = null;
  @Input() mainImageAlt = this.title; // default the main image alt to title

  @Input() creditImagePath: string | null = null;
  @Input() creditText = '';
  @Input() creditImageAlt = this.creditText; // default the image alt to the credit text

  @Input() description = '';

  @Output() clickTooltip = new EventEmitter<void>();

  handleTooltip() {
    this.clickTooltip.emit();
  }
}
