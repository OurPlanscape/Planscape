import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DataLayersStateService } from 'src/app/data-layers/data-layers.state.service';
import { CustomCobenefitsComponent } from './custom-cobenefits.component';

describe('CustomCobenefitsComponent', () => {
  let component: CustomCobenefitsComponent;
  let fixture: ComponentFixture<CustomCobenefitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomCobenefitsComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [DataLayersStateService],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomCobenefitsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
