import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RxSelectionToggleComponent } from './rx-selection-toggle.component';
import { MapConfigState } from '../map-config.state';
import { MockProvider } from 'ng-mocks';

describe('RxSelectionToggleComponent', () => {
  let component: RxSelectionToggleComponent;
  let fixture: ComponentFixture<RxSelectionToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RxSelectionToggleComponent],
      providers: [MockProvider(MapConfigState)],
    }).compileComponents();

    fixture = TestBed.createComponent(RxSelectionToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
