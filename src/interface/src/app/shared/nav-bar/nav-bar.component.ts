import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
})
export class NavBarComponent {
  @Input() breadcrumbs: string[] = [];
  @Output() goBack = new EventEmitter<void>();

  copyLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  print() {
    window.print();
  }
}
