import { Component } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
  selector: 'sg-toggle-tabs',
  standalone: true,
  imports: [MatButtonToggleModule],
  templateUrl: './toggle-tabs.component.html',
  styleUrl: './toggle-tabs.component.scss',
})
export class ToggleTabsComponent {}
