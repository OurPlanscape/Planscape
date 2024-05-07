import { Component, Input } from '@angular/core';
import { Plan } from '@types';

@Component({
  selector: 'app-area-details',
  templateUrl: './area-details.component.html',
  styleUrls: ['./area-details.component.scss'],
})
export class AreaDetailsComponent {
  @Input() plan!: Plan;
}
