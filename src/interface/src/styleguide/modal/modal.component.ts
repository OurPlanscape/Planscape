import {
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { ButtonComponent, ButtonVariant } from '../button/button.component';

@Component({
  selector: 'sg-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    MatDialogModule,
    ButtonComponent,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
  ],
})
export class ModalComponent {
  /**
   * Heading title
   */
  @Input() title: string = 'Title';
  /**
   * Set horizontal size variant of the modal
   */
  @Input() width: 'small' | 'medium' | 'large' | 'full' = 'medium';
  /**
   * Optional Material icon name at left of header
   */
  @Input() leadingIcon?: string | null;
  /**
   * Optional Material icon variant
   */
  @Input() leadingIconVariant?:
    | 'info'
    | 'alert'
    | 'warning'
    | 'error'
    | 'success' = 'info';
  /**
   * Optional alternative text for the right-most bottom button
   */
  @Input() primaryButtonText?: string = 'Done';
  /**
   * Optional attribute to enable/disable the right-most bottom button
   */
  @Input() primaryButtonDisabled: boolean = false;
  /**
   * Optional alternative style variant for the right-most bottom button
   */
  @Input() primaryButtonVariant: ButtonVariant = 'primary';
  /**
   * Show/hide left-most bottom button
   */
  @Input() hasSecondaryButton = true;
  /**
   * Optional attribute to enable/disable the left-most bottom button
   */
  @Input() secondaryButtonDisabled: boolean = false;
  /**
   * Optional alternative text for the left-most bottom button
   */
  @Input() secondaryButtonText?: string = 'Cancel';
  /**
   * Optional alternative style variant for the left-most bottom button
   */
  @Input() secondaryButtonVariant: ButtonVariant = 'ghost';
  /**
   * Whether or not to show the close button in the header
   */
  @Input() scrollableContent? = false;
  /**
   * Whether or not to show the tooltip button in the header
   */
  @Input() showClose? = true;
  /**
   * Whether or not to show the header at all
   */
  @Input() showToolTip? = false;
  /**
   * Whether or not to show the header at all
   */
  @Input() hasHeader? = true;
  /**
   * Short header
   */
  @Input() shortHeader? = false;
  /**
   * Whether or not to show the footer at all
   */
  @Input() hasFooter? = true;
  /**
   * Whether the buttons should be centered
   */
  @Input() centerFooter? = false;
  /**
   * Whether or not to use default padding for the projected content
   */
  @Input() padBody? = false;
  /**
   * Whether or not to show the borders on header and footer
   */
  @Input() showBorders? = true;

  @Output() clickedSecondary = new EventEmitter<any>();
  @Output() clickedPrimary = new EventEmitter<any>();
  @Output() clickedClose = new EventEmitter<any>();

  @ContentChild('tooltipContentDiv', { static: false })
  tooltipContentDiv?: ElementRef | null = null;

  constructor() {}

  get hasTooltipContent(): boolean {
    return !!this.tooltipContentDiv;
  }

  handleCloseButton(): void {
    this.clickedClose.emit();
  }

  handleSecondaryButton(): void {
    this.clickedSecondary.emit();
  }

  handlePrimaryButton(): void {
    this.clickedPrimary.emit();
  }

  @HostBinding('class.small')
  get isSmall() {
    return this.width === 'small';
  }
  @HostBinding('class.medium')
  get isMedium() {
    return this.width === 'medium';
  }
  @HostBinding('class.large')
  get isLarge() {
    return this.width === 'large';
  }
  @HostBinding('class.full')
  get isFull() {
    return this.width === 'full';
  }

  @HostBinding('class.no-border')
  get noBorders() {
    return !this.showBorders;
  }
}
