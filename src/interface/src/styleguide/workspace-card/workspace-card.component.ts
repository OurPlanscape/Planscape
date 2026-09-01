import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectableLinkDirective } from '../selectable-link/selectable-link.directive';

/**
 * Workspace Card for displaying a workspace on the workspaces list
 */
@Component({
  selector: 'sg-workspace-card',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NgIf,
    RouterLink,
    SelectableLinkDirective,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './workspace-card.component.html',
  styleUrl: './workspace-card.component.scss',
})
export class WorkspaceCardComponent {
  @Input() name = '';
  @Input() planningAreasCount = 0;
  @Input() creator = '';
  @Input() createdAt = '';

  /** Where the card navigates. The whole card is the link. */
  @Input() link: string | any[] = [];

  @Input() userCanRename = false;
  @Input() userCanDelete = false;
  @Input() userCanShare = false;

  @Output() rename = new EventEmitter<void>();
  @Output() share = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  get planningAreasLabel(): string {
    return this.planningAreasCount === 1 ? 'Planning Area' : 'Planning Areas';
  }

  /** The menu sits inside the card's link, so its clicks must not navigate. */
  handleMenuClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();
  }
}
