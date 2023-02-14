import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CookieService } from 'ngx-cookie-service';
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics';

import { AccountDialogComponent } from './account-dialog/account-dialog.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FeaturesModule } from './features/features.module';
import { LoginComponent } from './login/login.component';
import { LayerInfoCardComponent } from './map/layer-info-card/layer-info-card.component';
import { MapControlPanelComponent } from './map/map-control-panel/map-control-panel.component';
import { MapNameplateComponent } from './map/map-nameplate/map-nameplate.component';
import { MapComponent } from './map/map.component';
import { PlanCreateDialogComponent } from './map/plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './map/project-card/project-card.component';
import { MaterialModule } from './material/material.module';
import { NavigationComponent } from './navigation/navigation.component';
import { PlanModule } from './plan/plan.module';
import { RegionSelectionComponent } from './region-selection/region-selection.component';
import {
  AuthGuard,
  AuthService,
  MapService,
  PlanService,
  PopupService,
  SessionService,
} from './services';
import { SharedModule } from './shared/shared.module';
import { SignupComponent } from './signup/signup.component';
import { StringifyMapConfigPipe } from './stringify-map-config.pipe';
import { TopBarComponent } from './top-bar/top-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    LoginComponent,
    SignupComponent,
    NavigationComponent,
    TopBarComponent,
    AccountDialogComponent,
    RegionSelectionComponent,
    ProjectCardComponent,
    StringifyMapConfigPipe,
    MapNameplateComponent,
    PlanCreateDialogComponent,
    LayerInfoCardComponent,
    MapControlPanelComponent,
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FeaturesModule,
    FormsModule,
    HttpClientModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'csrftoken',
      headerName: 'X-CSRFTOKEN',
    }),
    LayoutModule,
    MaterialModule,
    NgxGoogleAnalyticsModule,
    NgxGoogleAnalyticsRouterModule,
    PlanModule,
    SharedModule,
    ReactiveFormsModule,
  ],
  providers: [
    AuthService,
    AuthGuard,
    PopupService,
    MapService,
    PlanService,
    CookieService,
    SessionService,
  ],
  bootstrap: [AppComponent],
  entryComponents: [AccountDialogComponent],
})
export class AppModule {}
