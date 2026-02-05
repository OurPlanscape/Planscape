import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTreatmentFooterComponent } from '@app/scenario/new-treatment-footer/new-treatment-footer.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

describe('NewTreatmentFooterComponent', () => {
  let component: NewTreatmentFooterComponent;
  let fixture: ComponentFixture<NewTreatmentFooterComponent>;
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
        NewTreatmentFooterComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
        MatDialogModule,
      ],
      providers: [{ provide: ActivatedRoute, useValue: fakeRoute }],
    }).compileComponents();

    fixture = TestBed.createComponent(NewTreatmentFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
