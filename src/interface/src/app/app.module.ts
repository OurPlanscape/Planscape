import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics';

import { AccountDialogComponent } from './account-dialog/account-dialog.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FeaturesModule } from './features/features.module';
import { HomeComponent } from './home/home.component';
import { PlanTableComponent } from './home/plan-table/plan-table.component';
import { RegionSelectionComponent } from './home/region-selection/region-selection.component';
import { LoginComponent } from './login/login.component';
import { LayerInfoCardComponent } from './map/layer-info-card/layer-info-card.component';
import { ConditionTreeComponent } from './map/map-control-panel/condition-tree/condition-tree.component';
import { MapControlPanelComponent } from './map/map-control-panel/map-control-panel.component';
import { MapNameplateComponent } from './map/map-nameplate/map-nameplate.component';
import { MapComponent } from './map/map.component';
import { PlanCreateDialogComponent } from './map/plan-create-dialog/plan-create-dialog.component';
import { ProjectCardComponent } from './map/project-card/project-card.component';
import { SignInDialogComponent } from './map/sign-in-dialog/sign-in-dialog.component';
import { MaterialModule } from './material/material.module';
import { NavigationComponent } from './navigation/navigation.component';
import { PlanModule } from './plan/plan.module';
import { RedirectGuard } from './redirect.guard';
import {
  AuthGuard,
  AuthService,
  MapService,
  PlanService,
  PopupService,
  SessionService,
  ValidationResolver,
} from './services';
import { SharedModule } from './shared/shared.module';
import { SignupComponent } from './signup/signup.component';
import { StringifyMapConfigPipe } from './stringify-map-config.pipe';
import { TopBarComponent } from './top-bar/top-bar.component';
import { DeleteAccountDialogComponent } from './account-dialog/delete-account-dialog/delete-account-dialog.component';
import { environment } from 'src/environments/environment';
import { RegionDropdownComponent } from './region-dropdown/region-dropdown.component';
import { WelcomeComponent } from './home/welcome/welcome.component';
import { PlanningAreasComponent } from './home/planning-areas/planning-areas.component';
import { PreviewComponent } from './home/preview/preview.component';
import { MatDialogModule } from '@angular/material/dialog';
import { ValidationEmailDialog } from './signup/validation-email-dialog/validation-email-dialog.component';
import { WINDOW_PROVIDERS } from './services/window.service';
import { ResetPasswordDialog } from './login/reset-password-dialog/reset_password_dialog';
import { MapConfigSummaryComponent } from './map/map-config-summary/map-config-summary.component';

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
    ConditionTreeComponent,
    HomeComponent,
    PlanTableComponent,
    SignInDialogComponent,
    DeleteAccountDialogComponent,
    RegionDropdownComponent,
    WelcomeComponent,
    PlanningAreasComponent,
    PreviewComponent,
    ResetPasswordDialog,
    ValidationEmailDialog,
    MapConfigSummaryComponent,
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
    NgxGoogleAnalyticsModule.forRoot(environment.google_analytics_id),
    NgxGoogleAnalyticsRouterModule,
    PlanModule,
    RouterModule,
    SharedModule,
    ReactiveFormsModule,
    MatDialogModule,
  ],
  providers: [
    AuthService,
    AuthGuard,
    PopupService,
    MapService,
    PlanService,
    CookieService,
    SessionService,
    RedirectGuard,
    ValidationResolver,
    WINDOW_PROVIDERS,
  ],
  bootstrap: [AppComponent],
  entryComponents: [AccountDialogComponent],
})
export class AppModule {}
