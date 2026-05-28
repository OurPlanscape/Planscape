import { Component } from '@angular/core';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { StepsNavComponent } from '@styleguide';
import { FundingReportMapComponent } from '../funding-report-map/funding-report-map.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-full-report-view',
  standalone: true,
  imports: [AsyncPipe, FundingReportMapComponent, NavBarComponent, StepsNavComponent],
  templateUrl: './full-report-view.component.html',
  styleUrl: './full-report-view.component.scss'
})
export class FullReportViewComponent {

}
