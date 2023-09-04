import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { WINDOW } from '../../services/window.service';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
})
export class NavBarComponent {
  @Input() breadcrumbs: string[] = [];
  @Output() goBack = new EventEmitter<void>();

  constructor(@Inject(WINDOW) private window: Window) {}

  copyLink() {
    this.window.navigator.clipboard.writeText(this.window.location.href);
  }

  print() {
    this.window.print();
  }
}
