import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-explore-legacy',
  templateUrl: './explore-legacy.component.html',
  styleUrls: ['./explore-legacy.component.scss'],
})
export class ExploreLegacyComponent {
  planId = this.route.snapshot.paramMap.get('id');

  constructor(private route: ActivatedRoute) {}
}
