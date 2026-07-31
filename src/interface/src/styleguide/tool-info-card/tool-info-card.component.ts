import { NgForOf, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ToolInfoCardPartner {
  name: string;
  url: string;
  logo: string;
}

@Component({
  selector: 'sg-tool-info-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, NgIf, NgForOf],
  templateUrl: './tool-info-card.component.html',
  styleUrl: './tool-info-card.component.scss',
})
export class ToolInfoCardComponent {
  /** Title shown on the banner/header */
  @Input() cardTitle = '';
  /** Image/icon on the banner/header */
  @Input() mainImagePath: string | null = null;
  /** Alt text for the image/icon, default the main image alt to title */
  @Input() mainImageAlt = this.cardTitle; //
  /** credits image */
  @Input() creditImagePath: string | null = null;
  /** additional credit text */
  @Input() creditText = '';
  /** Alt text for credits image, default the image alt to the credit text */
  @Input() creditImageAlt = this.creditText;
  /** description text */
  @Input() description = '';
  /** Theme for the banner/header, defaults to light */
  @Input() theme: 'light' | 'dark' = 'light';
  /** Whether to show the tooltip (help) button */
  @Input() showTooltipButton = true;
  /** Additional partners */
  @Input() partners: ToolInfoCardPartner[] = [];

  /** Action when clicking on tooltip. */
  @Output() clickTooltip = new EventEmitter<void>();

  /**
   * Fires when a partner logo is clicked. Exposed as an output so the consumer
   * can decide whether it is worth tracking - the styleguide stays free of
   * analytics dependencies.
   */
  @Output() clickPartner = new EventEmitter<ToolInfoCardPartner>();

  /**
   * @ignore
   */
  handleTooltip() {
    this.clickTooltip.emit();
  }
}
