import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { createFeatureGuard } from './features/feature.guard';

import { LoginComponent } from './login/login.component';
import { MapComponent } from './map/map.component';
import { RegionSelectionComponent } from './region-selection/region-selection.component';
import { SignupComponent } from './signup/signup.component';

const routes: Routes = [
  { path: '', redirectTo: 'region', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [createFeatureGuard('login')],
  },
  {
    path: 'signup',
    component: SignupComponent,
    canActivate: [createFeatureGuard('login')],
  },
  { path: 'region', component: RegionSelectionComponent },
  { path: 'map', component: MapComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
