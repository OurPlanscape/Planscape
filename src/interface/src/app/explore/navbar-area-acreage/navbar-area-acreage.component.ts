import { Component, Input } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-navbar-area-acreage',
  standalone: true,
  imports: [CommonModule, NgIf, MatProgressSpinnerModule],
  templateUrl: './navbar-area-acreage.component.html',
  styleUrl: './navbar-area-acreage.component.scss'
})
export class NavbarAreaAcreageComponent {
  @Input() isLoading: boolean = false;
  @Input() acres: number | null = null;


}
