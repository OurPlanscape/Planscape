import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  HttpClientXsrfModule,
} from '@angular/common/http';
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
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FeaturesModule } from './features/features.module';
import { HomeComponent } from './home/home.component';
import { PlanTableComponent } from './home/plan-table/plan-table.component';
import { LoginComponent } from './login/login.component';

import { MaterialModule } from './material/material.module';
import { NavigationComponent } from './navigation/navigation.component';
import { PlanModule } from './plan/plan.module';

import {
  AuthGuard,
  AuthService,
  MapService,
  PlanService,
  PopupService,
  SessionService,
} from './services';
import { SharedModule } from './shared/shared.module';
import { AboutComponent } from './home/about/about.component';
import { SignupComponent } from './signup/signup.component';
import { TopBarComponent } from './top-bar/top-bar.component';

import { environment } from 'src/environments/environment';
import { WelcomeComponent } from './home/welcome/welcome.component';
import { PlanningAreasComponent } from './home/planning-areas/planning-areas.component';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { WINDOW_PROVIDERS } from './services/window.service';
import { ResetPasswordDialogComponent } from './forget-password/reset-password-dialog/reset_password_dialog.component';
import { ForgetPasswordComponent } from './forget-password/forget-password.component';
import { NgChartsModule } from 'ng2-charts';
import { RedirectGuard } from './services/redirect.guard';
import { PasswordResetComponent } from './password-reset/password-reset.component';
import { ConfirmationDialogComponent } from './password-reset/confirmation-dialog/confirmation-dialog.component';
import { AccountValidationComponent } from './account-validation/account-validation.component';
import { MapModule } from './map/map.module';
import { DeleteDialogComponent } from './delete-dialog/delete-dialog.component';
import { NgxMaskModule } from 'ngx-mask';
import { ThankYouComponent } from './signup/thank-you/thank-you.component';
import { LearnMoreComponent } from './home/learn-more/learn-more.component';
import { HorizonalCardComponent } from './home/horizonal-card/horizonal-card.component';
import { InfoCardComponent } from './signup/info-card/info-card.component';
import { SharePlanDialogComponent } from './home/share-plan-dialog/share-plan-dialog.component';
import { ChipInputComponent } from './home/chip-input/chip-input.component';
import { JwtInterceptor } from '@services/jwt-interceptor.service';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    SignupComponent,
    NavigationComponent,
    TopBarComponent,
    HomeComponent,
    PlanTableComponent,
    WelcomeComponent,
    PlanningAreasComponent,
    ResetPasswordDialogComponent,
    ForgetPasswordComponent,
    AboutComponent,
    PasswordResetComponent,
    ConfirmationDialogComponent,
    AccountValidationComponent,
    DeleteDialogComponent,
    ThankYouComponent,
    LearnMoreComponent,
    HorizonalCardComponent,
    InfoCardComponent,
    SharePlanDialogComponent,
    ChipInputComponent,
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
    NgChartsModule,
    MapModule,
    NgxMaskModule.forRoot(),
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
    WINDOW_PROVIDERS,
    CurrencyPipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
