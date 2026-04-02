import { Component, Input } from '@angular/core';
import { TreatmentPlan } from '@app/types';

@Component({
  selector: 'app-treatment-plan-cards-list',
  standalone: true,
  imports: [],
  templateUrl: './treatment-plan-cards-list.component.html',
  styleUrl: './treatment-plan-cards-list.component.scss'
})
export class TreatmentPlanCardsListComponent {
  @Input() plans : TreatmentPlan[] = []; 
}
