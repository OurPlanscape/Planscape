import { Component } from '@angular/core';
import { BaseLayersListComponent } from '../base-layers-list/base-layers-list.component';

@Component({
  selector: 'app-base-layers',
  standalone: true,
  imports: [BaseLayersListComponent],
  templateUrl: './base-layers.component.html',
  styleUrl: './base-layers.component.scss',
})
export class BaseLayersComponent {}
