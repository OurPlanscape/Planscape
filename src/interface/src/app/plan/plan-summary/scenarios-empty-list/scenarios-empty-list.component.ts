import { Component } from '@angular/core';
import { ActionCardComponent } from '@styleguide';

@Component({
  selector: 'app-scenarios-empty-list',
  standalone: true,
  imports: [ActionCardComponent],
  templateUrl: './scenarios-empty-list.component.html',
  styleUrl: './scenarios-empty-list.component.scss',
})
export class ScenariosEmptyListComponent {}
