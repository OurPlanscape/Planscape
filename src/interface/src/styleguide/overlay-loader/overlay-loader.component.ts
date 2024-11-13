import { Component, HostBinding, Input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'sg-overlay-loader',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './overlay-loader.component.html',
  styleUrl: './overlay-loader.component.scss',
})
export class OverlayLoaderComponent {
  @Input() offsetTop = 0;

  @HostBinding('style.top.px') get top(): number {
    return this.offsetTop;
  }
}
