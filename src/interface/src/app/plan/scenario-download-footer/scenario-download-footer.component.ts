import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ButtonComponent } from '@styleguide';
import { ScenarioService } from '@services';
import { FileSaverService } from '@services';
// import { map } from 'rxjs';
import { getSafeFileName } from '../../shared/files';


@Component({
  selector: 'app-scenario-download-footer',
  standalone: true,
  imports: [NgIf, MatProgressSpinnerModule, ButtonComponent],
  templateUrl: './scenario-download-footer.component.html',
  styleUrl: './scenario-download-footer.component.scss'
})
export class ScenarioDownloadFooterComponent {
  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService

  ) { }

  @Input() scenarioId!: number | undefined;
  downloadingScenario = false;

  handleDownload() {
    this.downloadingScenario = true;
    console.log('do a download...');

    //TODo: remove this
    const testScenarioName = 'what';

    if (this.scenarioId) {
      const filename = getSafeFileName(testScenarioName) + '_shp.zip';
      this.scenarioService.downloadShapeFiles(this.scenarioId).subscribe((data) => {
        const blob = new Blob([data], {
          type: 'application/zip',
        });
        this.fileServerService.saveAs(blob, filename);
      });
    }
  }




}
