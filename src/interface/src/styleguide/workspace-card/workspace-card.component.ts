import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { DatePipe, DecimalPipe, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

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

  @Input() userCanRename = false;
  @Input() userCanDelete = false;
  @Input() userCanShare = false;

  @Output() clicked = new EventEmitter<void>();
  @Output() rename = new EventEmitter<void>();
  @Output() share = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();

  get planningAreasLabel(): string {
    return this.planningAreasCount === 1 ? 'Planning Area' : 'Planning Areas';
  }

  @HostListener('click')
  handleClick() {
    this.clicked.emit();
  }

  stopEventPropagation(event: Event) {
    event.stopPropagation();
  }
}
