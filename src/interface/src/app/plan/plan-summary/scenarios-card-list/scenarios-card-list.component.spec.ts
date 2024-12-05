import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenariosCardListComponent } from './scenarios-card-list.component';
import { FeaturesModule } from '../../../features/features.module';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';

describe('ScenariosCardListComponent', () => {
  let component: ScenariosCardListComponent;
  let fixture: ComponentFixture<ScenariosCardListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FeaturesModule,
        HttpClientTestingModule,
        MatSnackBarModule,
        ScenariosCardListComponent,
        RouterTestingModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenariosCardListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
