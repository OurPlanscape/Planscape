import { Component } from '@angular/core';
import { TreatmentMapComponent } from '../treatment-map/treatment-map.component';
import { ProjectAreasTabComponent } from '../project-areas-tab/project-areas-tab.component';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OpacitySliderComponent } from '../../../styleguide/opacity-slider/opacity-slider.component';
import { TreatedStandsState } from '../treatment-map/treated-stands.state';

@Component({
  selector: 'app-treatment-project-area',
  standalone: true,
  imports: [
    TreatmentMapComponent,
    ProjectAreasTabComponent,
    JsonPipe,
    AsyncPipe,
    RouterLink,
    OpacitySliderComponent,
  ],
  templateUrl: './treatment-project-area.component.html',
  styleUrl: './treatment-project-area.component.scss',
})
export class TreatmentProjectAreaComponent {
  constructor(private treatedStandsState: TreatedStandsState) {}

  opacity = this.treatedStandsState.opacity$;

  changeValue(num: number) {
    this.treatedStandsState.setOpacity(num);
  }
}
