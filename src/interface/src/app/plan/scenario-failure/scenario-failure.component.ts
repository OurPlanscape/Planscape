import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ScenarioService } from '@services';
import { FileSaverService } from '@services/file-saver.service';

@Component({
  selector: 'app-scenario-failure',
  templateUrl: './scenario-failure.component.html',
  styleUrls: ['./scenario-failure.component.scss'],
})
export class ScenarioFailureComponent {
  @Input() scenarioName: string = '';
  @Input() scenarioId: string = '';
  @Output() goBack = new EventEmitter();

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
}
