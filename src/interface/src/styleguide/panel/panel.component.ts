import {
  Component,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { ButtonComponent } from '@styleguide';
import { MatIconModule } from '@angular/material/icon';
import { NgClass, NgForOf, NgIf } from '@angular/common';

export interface PanelIconButton {
  icon: string;
  actionName: string;
}

/**
 * Simple panel component to display content in a shaded box, with optional title and buttons.
 */
@Component({
  selector: 'sg-panel',
  standalone: true,
  imports: [ButtonComponent, MatIconModule, NgIf, NgForOf, NgClass],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
})
export class PanelComponent {
  constructor() {}

  /**
   * List of buttons to be displayed at the right side of the title
   */
  @Input() buttons: PanelIconButton[] = [];
  /**
   * Flag to determine if the content of the panel will have the same padding as the title
   * or no padding.
   */
  @Input() paddedContent = true;
  /**
   * Outputs when the user clicks any button, and emits the action name
   */
  @Output() clickedButton = new EventEmitter<string>();

  /**
   * Show line dividing title and content
   */
  @Input() showDivider = true;

  clickButton(actionName: string) {
    this.clickedButton.emit(actionName);
  }

  @HostBinding('class.no-divider')
  get noDivider() {
    return !this.showDivider;
  }
}
