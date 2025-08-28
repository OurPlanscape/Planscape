import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsToolsComponent } from './analytics-tools.component';
import { FeatureService } from '../../features/feature.service';

describe('AnalyticsToolsComponent', () => {
  let component: AnalyticsToolsComponent;
  let fixture: ComponentFixture<AnalyticsToolsComponent>;
  let mockFeatureService: jasmine.SpyObj<FeatureService>;

  beforeEach(async () => {
    mockFeatureService = jasmine.createSpyObj('FeatureService', [
      'isFeatureEnabled',
    ]);
    mockFeatureService.isFeatureEnabled.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [AnalyticsToolsComponent],
      providers: [{ provide: FeatureService, useValue: mockFeatureService }],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsToolsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide container when no tools are enabled', () => {
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(
      '.analytics-tools-container'
    );
    expect(container).toBeNull();
  });

  it('should show container when tools are enabled', () => {
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    fixture.detectChanges();
    const container = fixture.nativeElement.querySelector(
      '.analytics-tools-container'
    );
    expect(container).toBeTruthy();
  });

  it('should call onToolClick when tool is clicked', () => {
    spyOn(component, 'onToolClick');
    mockFeatureService.isFeatureEnabled.and.returnValue(true);
    fixture.detectChanges();

    component.onToolClick('climate-foresight');
    expect(component.onToolClick).toHaveBeenCalledWith('climate-foresight');
  });
});
