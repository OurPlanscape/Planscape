import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiMapControlComponent } from './multi-map-control.component';
import { MockProvider } from 'ng-mocks';
import { MapConfigState } from '../map-config.state';
import { MultiMapConfigState } from '../multi-map-config.state';

describe('MultiMapControlComponent', () => {
  let component: MultiMapControlComponent;
  let fixture: ComponentFixture<MultiMapControlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiMapControlComponent],
      providers: [
        MockProvider(MapConfigState),
        MockProvider(MultiMapConfigState),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiMapControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
