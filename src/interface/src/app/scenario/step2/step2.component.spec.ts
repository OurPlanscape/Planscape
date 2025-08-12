import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ExcludedAreasComponent } from './step2.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ExcludedAreasComponent', () => {
  let component: ExcludedAreasComponent;
  let fixture: ComponentFixture<ExcludedAreasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        ExcludedAreasComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExcludedAreasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
