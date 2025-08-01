import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ButtonComponent } from '@styleguide';
import { ScenarioService } from '@services';
import { FileSaverService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { getSafeFileName } from '../../shared/files';
import { SNACK_ERROR_CONFIG } from '@shared';

@Component({
  selector: 'app-scenario-download-footer',
  standalone: true,
  imports: [NgIf, MatProgressSpinnerModule, ButtonComponent],
  templateUrl: './scenario-download-footer.component.html',
  styleUrl: './scenario-download-footer.component.scss',
})
export class ScenarioDownloadFooterComponent {
  constructor(
    private scenarioService: ScenarioService,
    private fileServerService: FileSaverService,
    private snackbar: MatSnackBar
  ) {}

  @Input() scenarioId!: number | undefined;
  @Input() scenarioName!: string;
  @Input() geoPackageURL!: string | null;
  downloadingScenario = false;

  handleDownload() {
    this.downloadingScenario = true;

    if (this.scenarioId && this.scenarioName) {
      const filename = getSafeFileName(this.scenarioName) + '.gpkg';
      this.scenarioService.downloadGeopackage(this.scenarioId).subscribe({
        next: (data) => {
          this.downloadingScenario = false;
          const blob = new Blob([data], {
            type: 'application/zip',
          });
          this.fileServerService.saveAs(blob, filename);
        },
        error: (e) => {
          this.downloadingScenario = false;
          console.error('Error downloading: ', e);
          this.snackbar.open(
            `Error: Could not generate a GeoPackage.`,
            'Dismiss',
            SNACK_ERROR_CONFIG
          );
        },
      });
    }
  }
}
