import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  HTTP_INTERCEPTORS,
  HttpClientModule,
  HttpClientXsrfModule,
} from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics';
import { AppRoutingModule } from '@app/app-routing.module';
import { AppComponent } from '@app/app.component';
import { ButtonComponent, OverlayLoaderComponent } from '@styleguide';
import { ChipInputComponent } from '@app/home/chip-input/chip-input.component';

import { FeaturesModule } from '@app/features/features.module';
import { HomeComponent } from '@app/home/home.component';
import { JwtInterceptor, WINDOW_PROVIDERS } from '@services';

import { LegacyMaterialModule } from '@app/material/legacy-material.module';

import { NgxMaskModule } from 'ngx-mask';

import { SharePlanDialogComponent } from '@app/home/share-plan-dialog/share-plan-dialog.component';
import { SharedModule } from '@shared';
import { WelcomeComponent } from '@app/home/welcome/welcome.component';
import { environment } from '@env/environment';
import { DeleteDialogComponent } from '@app/standalone/delete-dialog/delete-dialog.component';

import { PlanningAreasComponent } from '@app/standalone/planning-areas/planning-areas.component';
import { MatDialogModule } from '@angular/material/dialog';
import * as Sentry from '@sentry/angular';
import { LoggingHttpInterceptor } from '@services/logging-http.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    SharePlanDialogComponent,
    WelcomeComponent,
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
    LegacyMaterialModule,
    NgxGoogleAnalyticsModule.forRoot(environment.google_analytics_id),
    NgxGoogleAnalyticsRouterModule,
    RouterModule,
    SharedModule,
    ReactiveFormsModule,
    MatDialogModule,
    NgxMaskModule.forRoot(),
    ButtonComponent,
    DeleteDialogComponent,
    PlanningAreasComponent,
    OverlayLoaderComponent,
    ChipInputComponent,
  ],
  providers: [
    WINDOW_PROVIDERS,
    CurrencyPipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoggingHttpInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler(),
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
