import { Component, Input, OnInit } from '@angular/core';
import { PlanService } from 'src/app/services';
import { Plan, ProjectConfig } from 'src/app/types';

@Component({
  selector: 'app-scenario-configurations',
  templateUrl: './scenario-configurations.component.html',
  styleUrls: ['./scenario-configurations.component.scss'],
})
export class ScenarioConfigurationsComponent implements OnInit {
  @Input() plan: Plan | null = null;
  configurations: ProjectConfig[] = [];
  displayedColumns: string[] = [
    'select',
    'createdTimestamp',
    'scoreType',
    'priorities',
    'constraints',
  ];

  constructor(private planService: PlanService) {}

  ngOnInit(): void {
    this.planService.getProjects(this.plan?.id!).subscribe((result) => {
      this.configurations = result;
    });
  }
}
