import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule } from '@angular/material/legacy-button';
import { MatLegacyMenuModule } from '@angular/material/legacy-menu';
import { NgIf, NgSwitchCase } from '@angular/common';

/**
 * This component is used in combination with `<sg-expander-section>`.
 * It shows a radio button with its label, and additionally a tooltip.
 * The markup provided in content projection will be used for the tooltip.
 */
@Component({
  selector: 'sg-expander-item',
  standalone: true,
  imports: [
    MatIconModule,
    MatLegacyButtonModule,
    MatLegacyMenuModule,
    NgSwitchCase,
    NgIf,
  ],
  templateUrl: './expander-item.component.html',
  styleUrl: './expander-item.component.scss',
})
export class ExpanderItemComponent {
  /**
   * The label for the radio button
   */
  @Input() label: string = '';
  /**
   * The value for the radio button
   */
  @Input() value: string | number = '';
  /**
   * The name of the group (the input name) for the radio button
   */
  @Input() groupName: string = '';
  /**
   * Whether the item is checked (selected)
   */
  @Input() checked = false;
  /**
   * Whether it shows the tooltip icon
   */
  @Input() showTooltip = false;
  /**
   * Emitted when the user changes the selected option
   */
  @Output() optionSelected = new EventEmitter<string | number>();
}
