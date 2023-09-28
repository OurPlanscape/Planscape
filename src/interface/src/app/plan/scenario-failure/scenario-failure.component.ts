import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-scenario-failure',
  templateUrl: './scenario-failure.component.html',
  styleUrls: ['./scenario-failure.component.scss'],
})
export class ScenarioFailureComponent {
  @Output() goBack = new EventEmitter();
  constructor() {}
}
