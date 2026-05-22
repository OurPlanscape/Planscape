import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { ButtonComponent, SectionComponent } from '@styleguide';

interface ReportSection {
  id: string;
  label: string;
}

@Component({
  selector: 'app-funding-report',
  standalone: true,
  imports: [CommonModule, MatTabsModule, SectionComponent, ButtonComponent],
  templateUrl: './funding-report.component.html',
  styleUrl: './funding-report.component.scss',
})
export class FundingReportComponent {
  sections: ReportSection[] = [
    { id: 'map', label: 'Map' },
    { id: 'carbon', label: 'Carbon' },
    { id: 'wildfire', label: 'Wildfire Risk' },
    { id: 'water', label: 'Water' },
    { id: 'biomass', label: 'Biomass' },
  ];

  activeId = this.sections[0].id;

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    this.activeId = id;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
