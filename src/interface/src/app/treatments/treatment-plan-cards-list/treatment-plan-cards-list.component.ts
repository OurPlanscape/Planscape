import { NgFor } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TreatmentPlan } from '@app/types';
import { TreatmentCardComponent } from '@styleguide';

@Component({
  selector: 'app-treatment-plan-cards-list',
  standalone: true,
  imports: [NgFor, TreatmentCardComponent],
  templateUrl: './treatment-plan-cards-list.component.html',
  styleUrl: './treatment-plan-cards-list.component.scss'
})
export class TreatmentPlanCardsListComponent {
  @Input() plans : TreatmentPlan[] = []; 


  userCanDelete() {
    return true;
  }
   userCanDuplicate() {
    return true;
  }
  
  goToTreatment(treatment : TreatmentPlan) {
    console.log('clicking ', treatment,);
  }
  
  openDeleteDialog(treatment: TreatmentPlan) {
    console.log('deeleting ', treatment);

  }
  
  duplicateTreatment(treatment: TreatmentPlan) {
    console.log('deeleting ', treatment);

  }
}
