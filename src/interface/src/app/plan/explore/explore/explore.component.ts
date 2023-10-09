import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
})
export class ExploreComponent {
  planId = this.route.snapshot.paramMap.get('id');

  constructor(private route: ActivatedRoute) {}
}
