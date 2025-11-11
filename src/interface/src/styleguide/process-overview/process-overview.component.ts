import { Component, Input } from '@angular/core';
import { NgClass, NgForOf } from '@angular/common';

// TODO move this out of storybook. its not reusable.
export interface OverviewStep {
  icon: string;
  label: string;
  description: string;
}

@Component({
  selector: 'sg-process-overview',
  standalone: true,
  imports: [NgForOf, NgClass],
  templateUrl: './process-overview.component.html',
  styleUrl: './process-overview.component.scss',
})
export class ProcessOverviewComponent {
  @Input() steps: OverviewStep[] = [];
  protected readonly atob = atob;
}
