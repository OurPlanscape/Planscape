import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenarioDownloadFooterComponent } from './scenario-download-footer.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { FileSaverService } from '@services';
import { Subject } from 'rxjs';

describe('ScenarioDownloadFooterComponent', () => {
  let component: ScenarioDownloadFooterComponent;
  let fixture: ComponentFixture<ScenarioDownloadFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        MatSnackBarModule,
        HttpClientTestingModule,
        ScenarioDownloadFooterComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioDownloadFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('handleDownload', () => {
    let download: jasmine.Spy;

    beforeEach(() => {
      download = spyOn(
        TestBed.inject(FileSaverService),
        'downloadGeopackage'
      ).and.returnValue(new Subject<any>());
      component.geoPackageURL = 'https://example.test/scenario.zip';
      component.scenarioName = 'My Scenario';
    });

    it('only requests the geopackage once while one download is in flight', () => {
      component.handleDownload();
      component.handleDownload();
      component.handleDownload();

      expect(download).toHaveBeenCalledTimes(1);
      expect(component.downloadingScenario).toBeTrue();
    });

    it('does not get stuck when there is nothing to download', () => {
      component.geoPackageURL = null;

      component.handleDownload();

      expect(download).not.toHaveBeenCalled();
      expect(component.downloadingScenario).toBeFalse();
    });
  });
});
