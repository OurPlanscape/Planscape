import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { ExploreModesToggleComponent } from './explore-modes-toggle.component';
import { MapConfigState } from '../map-config.state';

describe('ExploreModesToggleComponent', () => {
  let component: ExploreModesToggleComponent;
  let fixture: ComponentFixture<ExploreModesToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreModesToggleComponent],
      providers: [MockProvider(MapConfigState)],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreModesToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
