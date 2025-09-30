import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { StepsNavComponent } from './steps-nav.component';
import { StepsComponent } from './steps.component';
import { StepComponent } from './step.component';
import { ButtonComponent } from '../button/button.component';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

const meta: Meta<StepsNavComponent> = {
  title: 'Components/StepsNav',
  component: StepsNavComponent,
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule,
        MatIconModule,
        CdkStepperModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        StepsComponent,
        StepComponent,
        StepsNavComponent,
        ButtonComponent,
      ],
    }),
  ],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<StepsNavComponent>;

// Basic Steps with Progress Navigation
export const BasicStepsWithNav: Story = {
  render: () => ({
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3>Steps Component with Progress Navigation</h3>
        <sg-steps>
          <sg-steps-nav></sg-steps-nav>
          <cdk-step label="Select Data Layers">
            <div style="padding: 20px; background: white;">
              <h4>Step 1: Select Data Layers</h4>
              <p>This is the content for selecting data layers.</p>
            </div>
          </cdk-step>
          <cdk-step label="Assign Favorability">
            <div style="padding: 20px; background: white;">
              <h4>Step 2: Assign Favorability</h4>
              <p>Configure favorability scores for each data layer.</p>
            </div>
          </cdk-step>
          <cdk-step label="Assign Pillars">
            <div style="padding: 20px; background: white;">
              <h4>Step 3: Assign Pillars</h4>
              <p>Map layers to strategic pillars.</p>
            </div>
          </cdk-step>
          <cdk-step label="Run Analysis">
            <div style="padding: 20px; background: white;">
              <h4>Step 4: Run Analysis</h4>
              <p>Review settings and run the analysis.</p>
            </div>
          </cdk-step>
        </sg-steps>
      </div>
    `,
  }),
};

// Integrated Steps with Forms Example
@Component({
  selector: 'sg-story-integrated-example',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepsComponent,
    StepComponent,
    StepsNavComponent,
    CdkStepperModule,
  ],
  template: `
    <div style="padding: 20px; background: #f5f5f5;">
      <h3>Steps Component with Progress Navigation and Forms</h3>
      <sg-steps
        [save]="saveStep"
        [savingStep]="savingStep"
        backLabel="Back"
        continueLabel="Save & Continue"
        finishLabel="Complete"
        (finished)="onFinish()">
        <!-- Navigation bar at the top -->
        <sg-steps-nav></sg-steps-nav>

        <cdk-step label="Personal Information" [stepControl]="personalForm">
          <form
            [formGroup]="personalForm"
            style="padding: 20px; background: white;">
            <h4>Personal Information</h4>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;"
                >First Name *</label
              >
              <input
                type="text"
                formControlName="firstName"
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                placeholder="Enter first name" />
              <div
                *ngIf="
                  personalForm.get('firstName')?.touched &&
                  personalForm.get('firstName')?.invalid
                "
                style="color: red; font-size: 12px; margin-top: 5px;">
                First name is required
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;"
                >Last Name *</label
              >
              <input
                type="text"
                formControlName="lastName"
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                placeholder="Enter last name" />
              <div
                *ngIf="
                  personalForm.get('lastName')?.touched &&
                  personalForm.get('lastName')?.invalid
                "
                style="color: red; font-size: 12px; margin-top: 5px;">
                Last name is required
              </div>
            </div>
          </form>
        </cdk-step>

        <cdk-step label="Contact Details" [stepControl]="contactForm">
          <form
            [formGroup]="contactForm"
            style="padding: 20px; background: white;">
            <h4>Contact Details</h4>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;">Email *</label>
              <input
                type="email"
                formControlName="email"
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                placeholder="Enter email" />
              <div
                *ngIf="
                  contactForm.get('email')?.touched &&
                  contactForm.get('email')?.invalid
                "
                style="color: red; font-size: 12px; margin-top: 5px;">
                Valid email is required
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;">Phone</label>
              <input
                type="tel"
                formControlName="phone"
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
                placeholder="Enter phone number" />
            </div>
          </form>
        </cdk-step>

        <cdk-step label="Additional Info" [stepControl]="additionalForm">
          <form
            [formGroup]="additionalForm"
            style="padding: 20px; background: white;">
            <h4>Additional Information</h4>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;"
                >Comments</label
              >
              <textarea
                formControlName="comments"
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 100px;"
                placeholder="Any additional comments">
              </textarea>
            </div>
            <div style="margin-bottom: 15px;">
              <label style="display: flex; align-items: center;">
                <input
                  type="checkbox"
                  formControlName="subscribe"
                  style="margin-right: 8px;" />
                Subscribe to newsletter
              </label>
            </div>
          </form>
        </cdk-step>

        <cdk-step label="Review & Submit">
          <div style="padding: 20px; background: white;">
            <h4>Review Your Information</h4>
            <div
              style="background: #f9f9f9; padding: 15px; border-radius: 4px; margin-top: 15px;">
              <p>
                <strong>Name:</strong> {{ personalForm.value.firstName }}
                {{ personalForm.value.lastName }}
              </p>
              <p><strong>Email:</strong> {{ contactForm.value.email }}</p>
              <p>
                <strong>Phone:</strong>
                {{ contactForm.value.phone || 'Not provided' }}
              </p>
              <p>
                <strong>Comments:</strong>
                {{ additionalForm.value.comments || 'None' }}
              </p>
              <p>
                <strong>Newsletter:</strong>
                {{ additionalForm.value.subscribe ? 'Yes' : 'No' }}
              </p>
            </div>
            <div
              style="margin-top: 20px; padding: 10px; background: #e8f5e9; border-radius: 4px; color: #2e7d32;">
              Click "Complete" below to finish the process.
            </div>
          </div>
        </cdk-step>
      </sg-steps>

      <div
        *ngIf="completed"
        style="margin-top: 20px; padding: 20px; background: #4caf50; color: white; border-radius: 4px; text-align: center;">
        <h3>✓ Form Completed Successfully!</h3>
        <p>All steps have been completed and saved.</p>
      </div>
    </div>
  `,
})
class IntegratedExampleComponent {
  personalForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
  });

  contactForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  additionalForm = this.fb.group({
    comments: [''],
    subscribe: [false],
  });

  savingStep = false;
  completed = false;

  constructor(private fb: FormBuilder) {}

  saveStep = (data: any): Observable<boolean> => {
    this.savingStep = true;

    // Simulate API call
    return of(true)
      .pipe(delay(1000))
      .pipe(
        map((result) => {
          this.savingStep = false;
          return result;
        })
      );
  };

  onFinish() {
    this.completed = true;
  }
}

export const IntegratedWithSteps: Story = {
  render: () => ({
    props: {},
    template: `<sg-story-integrated-example></sg-story-integrated-example>`,
    moduleMetadata: {
      imports: [IntegratedExampleComponent],
    },
  }),
};

// Navigation at Bottom
export const NavigationAtBottom: Story = {
  render: () => ({
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3>Steps with Navigation at the Bottom</h3>
        <sg-steps>
          <cdk-step label="First">
            <div style="padding: 20px; background: white;">
              <h4>Step 1</h4>
              <p>This example shows the navigation bar placed at the bottom instead of the top.</p>
            </div>
          </cdk-step>
          <cdk-step label="Second">
            <div style="padding: 20px; background: white;">
              <h4>Step 2</h4>
              <p>The developer has full control over where sg-steps-nav appears.</p>
            </div>
          </cdk-step>
          <cdk-step label="Third">
            <div style="padding: 20px; background: white;">
              <h4>Step 3</h4>
              <p>Simply place the sg-steps-nav component where you want it in your layout.</p>
            </div>
          </cdk-step>
          <!-- Navigation placed after the steps -->
          <sg-steps-nav></sg-steps-nav>
        </sg-steps>
      </div>
    `,
  }),
};

// Without Progress Navigation (Classic Steps)
export const ClassicStepsWithoutProgressNav: Story = {
  render: () => ({
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3>Classic Steps Component (without Progress Navigation)</h3>
        <sg-steps
          backLabel="Previous"
          continueLabel="Next"
          finishLabel="Submit">

          <cdk-step>
            <div style="padding: 20px; background: white;">
              <h4>Step 1: Introduction</h4>
              <p>This is the classic steps component without the visual progress stepper at the top.</p>
              <p>It shows a simple step counter and navigation buttons.</p>
            </div>
          </cdk-step>

          <cdk-step>
            <div style="padding: 20px; background: white;">
              <h4>Step 2: Details</h4>
              <p>The step count is shown at the bottom with the navigation buttons.</p>
              <p>This is useful when you want a simpler, more compact interface.</p>
            </div>
          </cdk-step>

          <cdk-step>
            <div style="padding: 20px; background: white;">
              <h4>Step 3: Completion</h4>
              <p>Final step content goes here.</p>
              <p>Click "Submit" to complete the process.</p>
            </div>
          </cdk-step>
        </sg-steps>
      </div>
    `,
  }),
};

// Linear vs Non-Linear Navigation
export const LinearNavigation: Story = {
  render: () => ({
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3>Linear Navigation (Must Complete Steps in Order)</h3>
        <sg-steps [linear]="true">
          <sg-steps-nav></sg-steps-nav>
          <cdk-step label="Step 1" [completed]="step1Completed">
            <div style="padding: 20px; background: white;">
              <h4>Step 1</h4>
              <p>You must complete this step before moving to the next.</p>
              <button
                (click)="step1Completed = true"
                style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Mark Step 1 Complete
              </button>
              <span *ngIf="step1Completed" style="margin-left: 10px; color: green;">✓ Completed</span>
            </div>
          </cdk-step>

          <cdk-step label="Step 2" [completed]="step2Completed">
            <div style="padding: 20px; background: white;">
              <h4>Step 2</h4>
              <p>This step is only accessible after completing Step 1.</p>
              <button
                (click)="step2Completed = true"
                style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Mark Step 2 Complete
              </button>
              <span *ngIf="step2Completed" style="margin-left: 10px; color: green;">✓ Completed</span>
            </div>
          </cdk-step>

          <cdk-step label="Step 3">
            <div style="padding: 20px; background: white;">
              <h4>Step 3</h4>
              <p>Final step - only accessible after completing Step 2.</p>
            </div>
          </cdk-step>
        </sg-steps>
      </div>
    `,
    props: {
      step1Completed: false,
      step2Completed: false,
    },
  }),
};

// Error Handling Example
@Component({
  selector: 'sg-story-error-example',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StepsComponent,
    StepsNavComponent,
    CdkStepperModule,
  ],
  template: `
    <div style="padding: 20px; background: #f5f5f5;">
      <h3>Error Handling in Steps</h3>
      <sg-steps
        [save]="saveWithError"
        [savingStep]="savingStep"
        errorKey="serverError"
        genericErrorMsg="Failed to save. Please try again.">
        <!-- Progress navigation -->
        <sg-steps-nav></sg-steps-nav>

        <cdk-step label="Valid Step" [stepControl]="validForm">
          <form
            [formGroup]="validForm"
            style="padding: 20px; background: white;">
            <h4>This step will save successfully</h4>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;">Name *</label>
              <input
                type="text"
                formControlName="name"
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
            </div>
          </form>
        </cdk-step>

        <cdk-step label="Error Step" [stepControl]="errorForm">
          <form
            [formGroup]="errorForm"
            style="padding: 20px; background: white;">
            <h4>This step will fail to save</h4>
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px;">Email *</label>
              <input
                type="email"
                formControlName="email"
                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
            </div>
            <div
              *ngIf="errorForm.errors?.['serverError']"
              style="padding: 10px; background: #ffebee; color: #c62828; border-radius: 4px; margin-top: 10px;">
              {{ errorForm.errors['serverError'] }}
            </div>
          </form>
        </cdk-step>

        <cdk-step label="Final Step">
          <div style="padding: 20px; background: white;">
            <h4>Final Step</h4>
            <p>You won't reach here until the error is resolved.</p>
          </div>
        </cdk-step>
      </sg-steps>
    </div>
  `,
})
class ErrorExampleComponent {
  validForm = this.fb.group({
    name: ['John Doe', Validators.required],
  });

  errorForm = this.fb.group({
    email: ['test@example.com', [Validators.required, Validators.email]],
  });

  savingStep = false;
  stepIndex = 0;

  constructor(private fb: FormBuilder) {}

  saveWithError = (_data: any): Observable<boolean> => {
    this.savingStep = true;
    this.stepIndex++;

    // Simulate error on second step
    if (this.stepIndex === 2) {
      return new Observable((observer) => {
        setTimeout(() => {
          this.savingStep = false;
          observer.error({
            message:
              'Server error: Unable to save email. Please use a different email address.',
          });
        }, 1000);
      });
    }

    return of(true).pipe(
      delay(1000),
      map((result) => {
        this.savingStep = false;
        return result;
      })
    );
  };
}

export const ErrorHandling: Story = {
  render: () => ({
    props: {},
    template: `<sg-story-error-example></sg-story-error-example>`,
    moduleMetadata: {
      imports: [ErrorExampleComponent],
    },
  }),
};

// Import for map operator
import { map } from 'rxjs/operators';
