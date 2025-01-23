import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-left-loading-overlay',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './left-loading-overlay.component.html',
  styleUrl: './left-loading-overlay.component.scss',
})
export class LeftLoadingOverlayComponent {}
