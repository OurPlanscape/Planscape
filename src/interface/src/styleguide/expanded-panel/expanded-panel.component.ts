import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { ButtonComponent } from '@styleguide';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'sg-expanded-panel',
  templateUrl: './expanded-panel.component.html',
  styleUrls: ['./expanded-panel.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    MatDialogModule,
    ButtonComponent,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
    MatButtonModule,
  ],
})
export class ExpandedPanelComponent {
  @Output() clickedClose = new EventEmitter<any>();

  constructor() {}

  handleCloseButton() {
    this.clickedClose.emit();
  }
}
