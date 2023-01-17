import { Legend, colormapConfigToLegend } from 'src/app/types';
import { take } from 'rxjs';
import { MapService } from './../../../services/map.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-create-scenarios-intro',
  templateUrl: './create-scenarios-intro.component.html',
  styleUrls: ['./create-scenarios-intro.component.scss']
})
export class CreateScenariosIntroComponent implements OnInit {
  readonly text1: string = `
    Scenarios consist of project areas identified by your priorities and constraints
    within the planning area. You can draw or upload your own project areas when creating
    scenarios or Planscape can recommend some project areas and scenarios within those
    project areas.
  `;

  readonly text2: string = `
    You can choose to use either Current Condition scores or Management Opportunity scores to
    inform your selection of priorities.
  `;

  readonly text3: string = `
    Define project areas based on choosing priorities based only on the current condition of
    the defined planning area. Future modeling is not considered in this mode.
  `;

  readonly text4: string = `
    Choose priorities using the Pillars of Resilience Framework. Priorities with higher
    opportunity scores (-1 to +1 range) represent how management value is greatest in the near
    term within the defined planning area. Future modeling is considered in this mode.
  `;

  readonly text5: string = `
    To learn more about how priorities are defined and used within this tool, visit
    linkaddresshere.
  `;

  legend: Legend | undefined;

  constructor(private mapService: MapService) { }

  ngOnInit(): void {
    this.mapService
      .getColormap('viridis') // TODO(leehana): replace once colormaps are finalized
      .pipe(take(1))
      .subscribe((colormapConfig) => {
        this.legend = colormapConfigToLegend(colormapConfig);
      });
  }

}
