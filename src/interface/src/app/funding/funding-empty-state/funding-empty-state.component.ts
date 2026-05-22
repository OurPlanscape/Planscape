import { Component, EventEmitter, Output } from '@angular/core';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'app-funding-empty-state',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './funding-empty-state.component.html',
  styleUrl: './funding-empty-state.component.scss',
})
export class FundingEmptyStateComponent {
  @Output() generateReport = new EventEmitter<void>();
}
