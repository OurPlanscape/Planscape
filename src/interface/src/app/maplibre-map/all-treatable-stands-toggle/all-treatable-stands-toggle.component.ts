import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopoverComponent, ToggleComponent } from '@styleguide';

@Component({
  selector: 'app-all-treatable-stands-toggle',
  standalone: true,
  imports: [FormsModule, PopoverComponent, ToggleComponent],
  templateUrl: './all-treatable-stands-toggle.component.html',
  styleUrl: './all-treatable-stands-toggle.component.scss',
})
export class AllTreatableStandsToggleComponent {}
