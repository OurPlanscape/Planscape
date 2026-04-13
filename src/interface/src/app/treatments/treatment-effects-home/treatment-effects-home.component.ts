import { Component } from '@angular/core';
import { ToolInfoCardComponent } from '@styleguide';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { TreatmentPlansListComponent } from '../treatment-plans-list/treatment-plans-list.component';

@Component({
  selector: 'app-treatment-effects-home',
  standalone: true,
  imports: [DashboardLayoutComponent, ToolInfoCardComponent, TreatmentPlansListComponent],
  templateUrl: './treatment-effects-home.component.html',
  styleUrl: './treatment-effects-home.component.scss'
})
export class TreatmentEffectsHomeComponent {

  

}
