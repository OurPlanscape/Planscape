import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExploreLegacyComponent } from './explore-legacy.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Component, Input } from '@angular/core';

@Component({ selector: 'app-map', template: '' })
class MapMockComponent {
  @Input() planId = '12';
}

describe('ExploreComponent', () => {
  let component: ExploreLegacyComponent;
  let fixture: ComponentFixture<ExploreLegacyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExploreLegacyComponent, MapMockComponent],
      imports: [RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreLegacyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
