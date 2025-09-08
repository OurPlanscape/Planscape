import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { UploadedScenarioViewComponent } from './uploaded-scenario-view.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MockProvider } from 'ng-mocks';
import { FeatureService } from 'src/app/features/feature.service';

describe('UploadedScenarioViewComponent', () => {
  let component: UploadedScenarioViewComponent;
  let fixture: ComponentFixture<UploadedScenarioViewComponent>;

  beforeEach(async () => {
    const fakeRoute = jasmine.createSpyObj(
      'ActivatedRoute',
      {},
      {
        snapshot: {
          paramMap: convertToParamMap({ id: '1234567890' }),
        },
      }
    );
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatSnackBarModule, MatDialogModule],
      providers: [
        { provide: ActivatedRoute, useValue: fakeRoute },
        UploadedScenarioViewComponent,
        MockProvider(FeatureService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadedScenarioViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
