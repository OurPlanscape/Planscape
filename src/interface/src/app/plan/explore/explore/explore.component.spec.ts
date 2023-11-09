import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExploreComponent } from './explore.component';
import { RouterTestingModule } from '@angular/router/testing';
import { Component, Input } from '@angular/core';

@Component({ selector: 'app-map', template: '' })
class MapMockComponent {
  @Input() planId = '12';
}

describe('ExploreComponent', () => {
  let component: ExploreComponent;
  let fixture: ComponentFixture<ExploreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExploreComponent, MapMockComponent],
      imports: [RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
