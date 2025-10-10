import { Component, Input } from '@angular/core';
import { SectionComponent } from '@styleguide';

@Component({
  selector: 'app-process-overview',
  standalone: true,
  imports: [SectionComponent],
  templateUrl: './process-overview.component.html',
  styleUrl: './process-overview.component.scss',
})
export class ProcessOverviewComponent {
  @Input() title: string = '';

  @Input() treatmentGoal: string = '';

  @Input() standSize: string = '';
}
