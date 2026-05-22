import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FundingDashboardComponent } from '@app/funding/funding-dashboard/funding-dashboard.component';
import { MockProvider } from 'ng-mocks';
import { BreadcrumbService } from '@services/breadcrumb.service';

describe('FundingDashboardComponent', () => {
  let component: FundingDashboardComponent;
  let fixture: ComponentFixture<FundingDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FundingDashboardComponent,
        NoopAnimationsModule,
        HttpClientTestingModule,
      ],
      providers: [MockProvider(BreadcrumbService)],
    }).compileComponents();

    fixture = TestBed.createComponent(FundingDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
