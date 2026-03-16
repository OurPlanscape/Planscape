import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClimateLayersComponent } from './climate-layers.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

describe('ClimateLayersComponent', () => {
  let component: ClimateLayersComponent;
  let fixture: ComponentFixture<ClimateLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimateLayersComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: new BehaviorSubject(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClimateLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
