import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { ButtonComponent } from '@styleguide';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'sg-collapsible-panel',
  standalone: true,
  imports: [
    NgIf,
    MatMenuModule,
    MatButtonModule,
    ButtonComponent,
    MatExpansionModule,
  ],
  templateUrl: './collapsible-panel.component.html',
  styleUrl: './collapsible-panel.component.scss',
})
export class CollapsiblePanelComponent {
  @Input() title = '';
  @Input() tooltipContent = '';

  @Input() isCollapsible = true;

  stopPropagation(e: Event) {
    e.stopPropagation();
  }
}
