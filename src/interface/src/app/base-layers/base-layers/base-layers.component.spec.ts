import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseLayersComponent } from './base-layers.component';
import { MockProvider } from 'ng-mocks';
import { BaseLayersStateService } from '../base-layers.state.service';
import { of } from 'rxjs';

describe('BaseLayersComponent', () => {
  let component: BaseLayersComponent;
  let fixture: ComponentFixture<BaseLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseLayersComponent],
      providers: [
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
          categorizedBaseLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BaseLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
