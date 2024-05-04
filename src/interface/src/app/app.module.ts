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
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FeaturesModule } from './features/features.module';
import { HomeComponent } from './home/home.component';
import { PlanTableComponent } from './home/plan-table/plan-table.component';

import { MaterialModule } from './material/material.module';
import { NavigationComponent } from './navigation/navigation.component';
import { SharedModule } from '@shared';
import { SignupComponent } from './signup/signup.component';
import { TopBarComponent } from './top-bar/top-bar.component';

import { environment } from 'src/environments/environment';
import { WelcomeComponent } from './home/welcome/welcome.component';
import { PlanningAreasComponent } from './home/planning-areas/planning-areas.component';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { JwtInterceptor, WINDOW_PROVIDERS } from '@services';
import { NgChartsModule } from 'ng2-charts';
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
import { ButtonComponent } from '@styleguide';
import { AboutComponent } from './home/about/about.component';

@NgModule({
  declarations: [
    AppComponent,
    SignupComponent,
    NavigationComponent,
    TopBarComponent,
    HomeComponent,
    PlanTableComponent,
    WelcomeComponent,
    PlanningAreasComponent,
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
    AboutComponent, // remove
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
    RouterModule,
    SharedModule,
    ReactiveFormsModule,
    MatDialogModule,
    NgChartsModule,
    MapModule,
    NgxMaskModule.forRoot(),
    ButtonComponent,
  ],
  providers: [
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
