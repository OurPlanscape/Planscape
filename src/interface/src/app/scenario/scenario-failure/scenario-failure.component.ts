import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import { FormMessageType, ScenarioResultStatus } from '@types';
import { FeaturesModule } from 'src/app/features/features.module';

@Component({
  standalone: true,
  imports: [FeaturesModule, NgIf, ButtonComponent, MatIconModule],
  selector: 'app-scenario-failure',
  templateUrl: './scenario-failure.component.html',
  styleUrls: ['./scenario-failure.component.scss'],
})
export class ScenarioFailureComponent {
  @Input() scenarioName = '';
  @Input() scenarioId: number | undefined = undefined;
  @Input() scenarioState: ScenarioResultStatus = 'FAILURE';
  @Output() goBack = new EventEmitter();
  @Output() tryAgain = new EventEmitter();

  constructor(
  ) { }


  protected readonly FormMessageType = FormMessageType;
}
