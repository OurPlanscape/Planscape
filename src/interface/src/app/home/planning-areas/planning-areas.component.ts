import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@styleguide';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-planning-areas',
  standalone: true,
  imports: [
    MatIconModule,
    RouterLink,
    ButtonComponent,
    MatMenuModule,
    MatButtonModule,
  ],
  templateUrl: './planning-areas.component.html',
  styleUrl: './planning-areas.component.scss',
})
export class PlanningAreasComponent {}
