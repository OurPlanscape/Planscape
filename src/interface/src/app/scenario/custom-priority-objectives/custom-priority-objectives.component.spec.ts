import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CustomPriorityObjectivesComponent } from './custom-priority-objectives.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CustomPriorityObjectivesComponent', () => {
  let component: CustomPriorityObjectivesComponent;
  let fixture: ComponentFixture<CustomPriorityObjectivesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomPriorityObjectivesComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomPriorityObjectivesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
