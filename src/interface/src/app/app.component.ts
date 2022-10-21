import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  sidebarOpen = false;

  toggleSidebar(event: Event) {
    this.sidebarOpen = !this.sidebarOpen;
  }

}
