import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';

interface WelcomeHighlight {
  icon: string;
  text: string;
}

/**
 * Shown right after a user creates their first workspace.
 * Not an `sg-modal`: no header, edge to edge illustration, 8px radius.
 */
@Component({
  selector: 'app-welcome-workspace-modal',
  standalone: true,
  imports: [ButtonComponent, MatIconModule, NgFor],
  templateUrl: './welcome-workspace-modal.component.html',
  styleUrl: './welcome-workspace-modal.component.scss',
})
export class WelcomeWorkspaceModalComponent {
  readonly dialogRef =
    inject<MatDialogRef<WelcomeWorkspaceModalComponent>>(MatDialogRef);

  readonly highlights: WelcomeHighlight[] = [
    {
      icon: 'image',
      text: 'Upload or draw a planning area to run scenarios and analyses',
    },
    {
      icon: 'map',
      text: 'View, organize, and upload data in the Map Viewer',
    },
    {
      icon: 'groups',
      text: 'Invite colleagues with the Share feature',
    },
  ];

  close() {
    this.dialogRef.close();
  }
}
