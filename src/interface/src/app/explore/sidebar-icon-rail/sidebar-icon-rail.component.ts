import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface SidebarRailItem {
  id: string;
  /** Material symbol name. */
  icon: string;
  /** Shown as the tooltip, and as the panel title. */
  label: string;
  /** Rendered muted and not selectable, for items whose panel doesn't exist yet. */
  disabled?: boolean;
}

@Component({
  selector: 'app-sidebar-icon-rail',
  standalone: true,
  imports: [NgFor, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar-icon-rail.component.html',
  styleUrl: './sidebar-icon-rail.component.scss',
})
export class SidebarIconRailComponent {
  @Input() items: SidebarRailItem[] = [];
  @Input() activeId: string | null = null;

  @Output() itemSelected = new EventEmitter<SidebarRailItem>();

  selectItem(item: SidebarRailItem) {
    if (!item.disabled) {
      this.itemSelected.emit(item);
    }
  }
}
