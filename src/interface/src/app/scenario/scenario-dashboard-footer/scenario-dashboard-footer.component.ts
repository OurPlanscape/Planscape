import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FileSaverService, ScenarioService } from '@app/services';
import { Scenario } from '@app/types';
import { ButtonComponent } from '@styleguide';
import { ScenarioState } from '../scenario.state';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { getSafeFileName } from '@app/shared/files';
import { SNACK_ERROR_CONFIG } from '@app/shared';
import { GeopackageFailureModalComponent } from '../geopackage-failure-modal/geopackage-failure-modal.component';
import { MatMenuModule } from '@angular/material/menu';
import { LegacyScenarioConfigOverlayComponent } from '../legacy-scenario-config-overlay/legacy-scenario-config-overlay.component';
import { ScenarioConfigOverlayComponent } from '../scenario-config-overlay/scenario-config-overlay.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-scenario-dashboard-footer',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    MatMenuModule,
    LegacyScenarioConfigOverlayComponent,
    ScenarioConfigOverlayComponent,
  ],
  templateUrl: './scenario-dashboard-footer.component.html',
  styleUrl: './scenario-dashboard-footer.component.scss',
})
export class ScenarioDashboardFooterComponent {
  @Input() scenario: Scenario | null = null;

  downloadingScenario = false;
  displayScenarioConfigOverlay$ = this.scenarioState.displayConfigOverlay$;

  buttonLabels: { [key: string]: string } = {
    FAILED: 'GeoPackage Failed',
    SUCCEEDED: 'Download GeoPackage',
    PENDING: 'Generating GeoPackage',
    PROCESSING: 'Generating GeoPackage',
  };

  constructor(
    private scenarioService: ScenarioService,
    private scenarioState: ScenarioState,
    private fileServerService: FileSaverService,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  handleButton() {
    if (this.scenario?.geopackage_status === 'SUCCEEDED') {
      this.handleDownload();
    } else if (this.scenario?.geopackage_status === 'FAILED') {
      this.displayFailureModal();
    }
    // other states should be disabled, so do nothing
  }

  handleDownload() {
    this.downloadingScenario = true;

    if (this.scenario?.geopackage_url && this.scenario?.name) {
      const filename = getSafeFileName(this.scenario.name) + '.zip';
      this.scenarioService
        .downloadGeopackage(this.scenario.geopackage_url)
        .subscribe({
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

  navigateToScenario() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
