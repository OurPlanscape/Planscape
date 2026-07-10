import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingReportFooterComponent } from './funding-report-footer.component';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('FundingReportFooterComponent', () => {
  let component: FundingReportFooterComponent;
  let fixture: ComponentFixture<FundingReportFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        FundingReportFooterComponent,
        MatSnackBarModule,
      ],
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingReportFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
