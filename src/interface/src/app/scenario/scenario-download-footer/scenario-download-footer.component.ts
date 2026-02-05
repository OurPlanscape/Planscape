import { Component, Input } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ButtonComponent } from '@styleguide';
import { ScenarioService } from '@services';
import { FileSaverService } from '@services';
import { MatSnackBar } from '@angular/material/snack-bar';
import { getSafeFileName } from '@shared/files';
import { SNACK_ERROR_CONFIG } from '@shared';
import { ScenarioState } from '../scenario.state';
import { FeaturesModule } from '@features/features.module';
import { ScenarioConfigOverlayComponent } from '@scenario/scenario-config-overlay/scenario-config-overlay.component';
import { ScenarioV3ConfigOverlayComponent } from '@scenario/scenario-v3-config-overlay/scenario-v3-config-overlay.component';
import { MatMenuModule } from '@angular/material/menu';
import { GeopackageFailureModalComponent } from '@scenario/geopackage-failure-modal/geopackage-failure-modal.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-scenario-download-footer',
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    MatProgressSpinnerModule,
    ButtonComponent,
    FeaturesModule,
    MatMenuModule,
    ScenarioConfigOverlayComponent,
    ScenarioV3ConfigOverlayComponent,
  ],
  templateUrl: './scenario-download-footer.component.html',
  styleUrl: './scenario-download-footer.component.scss',
})
export class ScenarioDownloadFooterComponent {
  constructor(
    private scenarioService: ScenarioService,
    private scenarioState: ScenarioState,
    private fileServerService: FileSaverService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  @Input() scenarioId!: number | undefined;
  @Input() scenarioName!: string;
  @Input() scenarioVersion: string = 'V2';
  @Input() geoPackageURL?: string | null;
  @Input() geoPackageStatus?: string | null;

  downloadingScenario = false;
  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;

  buttonLabels: { [key: string]: string } = {
    FAILED: 'GeoPackage Failed',
    SUCCEEDED: 'Download GeoPackage',
    PENDING: 'Generating GeoPackage',
    PROCESSING: 'Generating GeoPackage',
  };

  handleButton() {
    if (this.geoPackageStatus === 'SUCCEEDED') {
      this.handleDownload();
    } else if (this.geoPackageStatus === 'FAILED') {
      this.displayFailureModal();
    }
    // other states should be disabled, so do nothing
  }

  handleDownload() {
    this.downloadingScenario = true;

    if (this.geoPackageURL && this.scenarioName) {
      const filename = getSafeFileName(this.scenarioName) + '.zip';
      this.scenarioService.downloadGeopackage(this.geoPackageURL).subscribe({
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

  displayFailureModal() {
    const dialogRef = this.dialog.open(GeopackageFailureModalComponent);
    return dialogRef.afterClosed();
  }

  setDisplayOverlay(display: boolean) {
    this.scenarioState.setDisplayOverlay(display);
  }
}
