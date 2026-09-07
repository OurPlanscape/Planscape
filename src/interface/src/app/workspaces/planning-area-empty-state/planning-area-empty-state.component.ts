import { Component } from '@angular/core';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-planning-area-empty-state',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './planning-area-empty-state.component.html',
  styleUrl: './planning-area-empty-state.component.scss',
})
export class PlanningAreaEmptyStateComponent {
  handleDraw() {
    // TODO: Will be covered as part of PLAN-3858
  }
  handleUpload() {
    // TODO: Will be covered as part of PLAN-3857
  }
}
