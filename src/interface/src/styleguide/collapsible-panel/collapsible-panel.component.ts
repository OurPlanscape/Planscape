import { Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'sg-collapsible-panel',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    ButtonComponent,
  ],
  templateUrl: './collapsible-panel.component.html',
  styleUrl: './collapsible-panel.component.scss',
})
export class CollapsiblePanelComponent {
  isOpen = true;
  @Input() title = '';
  @Input() tooltipContent = '';

  // remove after turning on features
  @Input() isCollapsible = true;

  togglePanel(e: Event) {
    if (this.isCollapsible) {
      this.isOpen = !this.isOpen;
    }

    e.preventDefault();
  }

  stopPropagation(e: Event) {
    e.stopPropagation();
  }
}
