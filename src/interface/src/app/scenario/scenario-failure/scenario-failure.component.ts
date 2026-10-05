import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '@styleguide';
import {
  FormMessageType,
  ScenarioResultError,
  ScenarioResultStatus,
  SYSTEM_ERRORS_SET,
  USER_REVISABLE_ERRORS_SET,
} from '@types';
import { FeaturesModule } from '@features/features.module';
import { FEEDBACK_URL } from '@app/shared';

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
  @Input() scenarioResultStatus: ScenarioResultStatus = 'FAILURE';
  @Input() scenarioErrorCodes: ScenarioResultError[] = [];
  @Input() loadingCopyDialog = false;
  @Input() variant: 'default' | 'dashboard' = 'default';
  @Output() goBack = new EventEmitter();
  @Output() tryAgain = new EventEmitter();

  get isPanic() {
    return this.scenarioResultStatus === 'PANIC';
  }

  get isRevisable() {
    return this.scenarioErrorCodes.some((e) =>
      USER_REVISABLE_ERRORS_SET.has(e.error_code)
    );
  }

  get isSystemError() {
    return this.scenarioErrorCodes.some((e) =>
      SYSTEM_ERRORS_SET.has(e.error_code)
    );
  }

  submitFeedback() {
    window.open(FEEDBACK_URL, '_blank');
  }

  protected readonly FormMessageType = FormMessageType;
}
