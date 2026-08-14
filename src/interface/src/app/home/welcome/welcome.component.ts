import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@styleguide';
import { FeaturesModule } from '@features/features.module';
import { FAQ_URL, KNOWLEDGE_BASE_URL } from '@shared';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [ButtonComponent, FeaturesModule, RouterLink],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent {
  constructor() {}

  protected readonly KNOWLEDGE_BASE_URL = KNOWLEDGE_BASE_URL;
  protected readonly FAQ_URL = FAQ_URL;
}
