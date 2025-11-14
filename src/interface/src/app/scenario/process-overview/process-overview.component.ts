import { Component, Input } from '@angular/core';
import { NgClass, NgForOf } from '@angular/common';

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
}
