import { NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FileSaverService, ScenarioService } from '@services';
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
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService
  ) {}

  downloadCsv() {
    const filename = this.scenarioName + ' csv';
    if (this.scenarioId) {
      this.scenarioService
        .downloadCsvData(this.scenarioId)
        .subscribe((data) => {
          const blob = new Blob([data], {
            type: 'application/zip',
          });

          this.fileServerService.saveAs(blob, filename);
        });
    }
  }

  protected readonly FormMessageType = FormMessageType;
}
