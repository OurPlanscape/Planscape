import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DirectImpactsMapsPanelComponent } from './direct-impacts-maps-panel.component';
import { MockDeclarations } from 'ng-mocks';
import { DirectImpactsMapComponent } from '../direct-impacts-map/direct-impacts-map.component';

describe('DirectImpactsMapsPanelComponent', () => {
  let component: DirectImpactsMapsPanelComponent;
  let fixture: ComponentFixture<DirectImpactsMapsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DirectImpactsMapsPanelComponent],
      declarations: [MockDeclarations(DirectImpactsMapComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectImpactsMapsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
