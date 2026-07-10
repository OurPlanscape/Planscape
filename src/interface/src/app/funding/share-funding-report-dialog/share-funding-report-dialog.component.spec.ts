import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { Clipboard } from '@angular/cdk/clipboard';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FundingReportService } from '@services/funding-report.service';
import { ShareDialogComponent } from '@shared/share-dialog/share-dialog.component';
import { ShareFundingReportDialogComponent } from './share-funding-report-dialog.component';

describe('ShareFundingReportDialogComponent', () => {
  let component: ShareFundingReportDialogComponent;
  let fixture: ComponentFixture<ShareFundingReportDialogComponent>;

  const data = {
    scenarioId: 7,
    name: 'My Scenario',
    aet: 25,
    totalFlameSeverity: '7_4' as const,
  };
  const shareInfo = { emails: ['a@x.com'], public_url: 'https://link/for/uuid' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ShareFundingReportDialogComponent,
        MockComponent(ShareDialogComponent),
        MatSnackBarModule,
        NoopAnimationsModule,
      ],
      providers: [
        MockProvider(MatDialogRef),
        MockProvider(FundingReportService, {
          getReportShareInfo: () => of(shareInfo),
          shareReport: () => of(shareInfo),
        }),
        MockProvider(Clipboard, { copy: () => true }),
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareFundingReportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds the title from the report name', () => {
    expect(component.title).toBe('Send "My Scenario" Summary Link');
  });

  it('sends invites with the current report configuration', () => {
    const service = TestBed.inject(FundingReportService);
    spyOn(service, 'shareReport').and.callThrough();

    component.emails = ['john@planscape.com'];
    component.send();

    expect(service.shareReport).toHaveBeenCalledWith(
      7,
      ['john@planscape.com'],
      25,
      '7_4'
    );
    // clears the pending emails on success
    expect(component.emails).toEqual([]);
  });

  it('does not send when there are no emails', () => {
    const service = TestBed.inject(FundingReportService);
    spyOn(service, 'shareReport').and.callThrough();

    component.emails = [];
    component.send();

    expect(service.shareReport).not.toHaveBeenCalled();
  });

  it('copies the public link to the clipboard', () => {
    const clipboard = TestBed.inject(Clipboard);
    spyOn(clipboard, 'copy').and.callThrough();

    component.copyLink();

    expect(clipboard.copy).toHaveBeenCalledWith('https://link/for/uuid');
  });
});
