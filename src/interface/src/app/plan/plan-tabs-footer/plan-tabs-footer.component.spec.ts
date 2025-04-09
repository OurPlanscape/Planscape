import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanTabsFooterComponent } from './plan-tabs-footer.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

describe('PlanTabsFooterComponent', () => {
  let component: PlanTabsFooterComponent;
  let fixture: ComponentFixture<PlanTabsFooterComponent>;
  const fakeRoute = jasmine.createSpyObj(
    'ActivatedRoute',
    {},
    {
      snapshot: {
        paramMap: convertToParamMap({ id: '1234567890' }),
      },
    }
  );
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlanTabsFooterComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
      ],
      providers: [{ provide: ActivatedRoute, useValue: fakeRoute }],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanTabsFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
