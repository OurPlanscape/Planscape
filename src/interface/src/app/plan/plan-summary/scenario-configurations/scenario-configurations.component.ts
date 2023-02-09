import { MapService } from './../../../services/map.service';
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

  constructor(
    private mapService: MapService,
    private planService: PlanService
  ) {}

  ngOnInit(): void {
    this.planService.getProjects(this.plan?.id!).subscribe((result) => {
      this.configurations = result;
    });
  }

  displayPriorities(priorities: string[]): string[] {
    let nameMap = this.mapService.conditionNameToDisplayNameMap$.value;
    return priorities
      .map((priority) => {
        if (nameMap.has(priority)) return nameMap.get(priority)!;
        return priority;
      });
  }
}
