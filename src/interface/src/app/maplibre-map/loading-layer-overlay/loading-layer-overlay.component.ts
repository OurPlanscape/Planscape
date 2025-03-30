import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-layer-overlay',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './loading-layer-overlay.component.html',
  styleUrl: './loading-layer-overlay.component.scss',
})
export class LoadingLayerOverlayComponent {}
