import { Component } from '@angular/core';

@Component({
  selector: 'app-treatment',
  standalone: true,
  imports: [],
  templateUrl: './treatment.component.html',
  styleUrl: './treatment.component.scss',
})
export class TreatmentComponent {
  goToProjectArea(id: string) {
    console.log('go to project area', id);
  }
}
