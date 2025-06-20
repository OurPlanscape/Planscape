import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavbarAreaAcreageComponent } from './navbar-area-acreage.component';

describe('NavbarAreaAcreageComponent', () => {
  let component: NavbarAreaAcreageComponent;
  let fixture: ComponentFixture<NavbarAreaAcreageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarAreaAcreageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarAreaAcreageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
