import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileSaverService, ScenarioService } from '@services';
import { FormMessageType, ScenarioResultStatus } from '@types';

@Component({
  selector: 'app-scenario-failure',
  templateUrl: './scenario-failure.component.html',
  styleUrls: ['./scenario-failure.component.scss'],
})
export class ScenarioFailureComponent {
  @Input() scenarioName = '';
  @Input() scenarioId = '';
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
