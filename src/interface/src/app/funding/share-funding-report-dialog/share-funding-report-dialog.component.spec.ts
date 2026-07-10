import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockProvider } from 'ng-mocks';
import { of, throwError } from 'rxjs';
import { Clipboard } from '@angular/cdk/clipboard';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FundingReportService } from '@services/funding-report.service';
import { ShareDialogComponent } from '@styleguide/share-dialog/share-dialog.component';
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
  const shareInfo = {
    emails: ['a@x.com'],
    public_url: 'https://link/for/uuid',
  };

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

  it('maps the share info emails into the people list', (done) => {
    component.people$.subscribe((emails) => {
      expect(emails).toEqual(['a@x.com']);
      done();
    });
  });

  it('sends invites with the current report configuration and clears the chips', () => {
    const service = TestBed.inject(FundingReportService);
    spyOn(service, 'shareReport').and.callThrough();
    component.emails = ['john@planscape.com'];

    component.onPrimary({ emails: ['john@planscape.com'], message: '' });

    expect(service.shareReport).toHaveBeenCalledWith(
      7,
      ['john@planscape.com'],
      25,
      '7_4'
    );
    expect(component.emails).toEqual([]);
  });

  it('does not send when there are no emails', () => {
    const service = TestBed.inject(FundingReportService);
    spyOn(service, 'shareReport');

    component.onPrimary({ emails: [], message: '' });

    expect(service.shareReport).not.toHaveBeenCalled();
  });

  it('confirms with a snackbar and clears submitting on a successful send', () => {
    const snackbar = spyOn<any>(component, 'showSnackbar');
    component.submitting = true;

    component.onPrimary({ emails: ['john@planscape.com'], message: '' });

    expect(snackbar).toHaveBeenCalledWith('Report summary link sent');
    expect(component.submitting).toBeFalse();
  });

  it('shows an error snackbar and clears submitting when the send fails', () => {
    const service = TestBed.inject(FundingReportService);
    spyOn(service, 'shareReport').and.returnValue(
      throwError(() => new Error('boom'))
    );
    const snackbar = spyOn<any>(component, 'showSnackbar');

    component.onPrimary({ emails: ['john@planscape.com'], message: '' });

    expect(snackbar).toHaveBeenCalledWith(
      'There was an error trying to send the report link. Please try again.'
    );
    expect(component.submitting).toBeFalse();
  });

  it('copies the public link to the clipboard and confirms with a snackbar', () => {
    const clipboard = TestBed.inject(Clipboard);
    spyOn(clipboard, 'copy').and.callThrough();
    const snackbar = spyOn<any>(component, 'showSnackbar');

    component.copyLink();

    expect(clipboard.copy).toHaveBeenCalledWith('https://link/for/uuid');
    expect(snackbar).toHaveBeenCalledWith('Link copied');
  });

  it('does not copy when the link is not ready yet', () => {
    const service = TestBed.inject(FundingReportService);
    spyOn(service, 'getReportShareInfo').and.returnValue(
      of({ emails: [], public_url: '' })
    );
    const clipboard = TestBed.inject(Clipboard);
    const copySpy = spyOn(clipboard, 'copy');
    const snackbar = spyOn<any>(component, 'showSnackbar');

    component.copyLink();

    expect(copySpy).not.toHaveBeenCalled();
    expect(snackbar).toHaveBeenCalledWith(
      'The link is not available yet. Please try again.'
    );
  });

  it('stops loading once the shared list resolves', () => {
    // beforeEach ran detectChanges, which subscribes people$ (synchronous mock).
    expect(component.isLoading).toBeFalse();
  });
});
