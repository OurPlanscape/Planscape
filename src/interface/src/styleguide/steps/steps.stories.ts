import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';

import { provideAnimations } from '@angular/platform-browser/animations';
import { StepsComponent } from './steps.component';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { mergeMap, of, throwError, timer } from 'rxjs';
import { StepComponent, StepDirective } from './step.component';

// interface just for testing
interface Person {
  name: string;
  age: number;
  email?: string;
}

@Component({
  selector: 'sg-step-demo-1',
  providers: [{ provide: StepDirective, useExisting: MyStep1Component }],
  template: `
    <form [formGroup]="form">
      <div>Enter "fail" for validation to fail</div>
      Name : <input type="text" id="name" formControlName="name" />
      <div *ngIf="!form.valid && form.touched">not valid</div>
      <div *ngIf="form.hasError('invalid') && form.touched">
        {{ form.getError('invalid') }}
      </div>
    </form>
  `,
})
class MyStep1Component extends StepDirective<Person> {
  form: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
  });

  getData(): Partial<Person> {
    return this.form.value;
  }
}

@Component({
  selector: 'sg-step-demo-2',
  providers: [{ provide: StepDirective, useExisting: MyStep2Component }],
  template: `
    <form [formGroup]="form">
      Age : <input type="text" id="name" formControlName="age" />
      <div *ngIf="!form.valid && form.touched">not valid</div>
    </form>
  `,
})
class MyStep2Component extends StepDirective<Person> {
  form: FormGroup = new FormGroup({
    age: new FormControl('', Validators.required),
  });

  getData(): Partial<Person> {
    return this.form.value;
  }
}

@Component({
  selector: 'sg-step-demo-3',
  providers: [{ provide: StepDirective, useExisting: MyStep3Component }],
  template: `
    <form [formGroup]="form">
      email (optional) :
      <input type="text" id="email" formControlName="email" />
      <div *ngIf="!form.valid && form.touched">not valid</div>
    </form>
  `,
})
class MyStep3Component extends StepDirective<Person> {
  form: FormGroup = new FormGroup({
    email: new FormControl('', Validators.email),
  });

  getData(): Partial<Person> {
    return this.form.value;
  }
}

const meta: Meta<StepsComponent<Person>> = {
  title: 'Components/Steps',
  component: StepsComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({
      declarations: [MyStep1Component, MyStep2Component, MyStep3Component],
      imports: [
        CommonModule,
        CdkStepperModule,
        ReactiveFormsModule,
        StepComponent,
      ],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: {
      ...args,
      index: 0,
      saveData: (data: Partial<Person>) => {
        return timer(1000).pipe(
          mergeMap(() => {
            return data.name === 'fail'
              ? throwError(() => new Error('Oh no, some errors while saving!'))
              : of(true);
          })
        );
      },
    },
    template: `
<section style='height: 200px; background-color: #d0d0d0'>
  <div>Index is {{index || 0}}</div>
  <sg-steps ${argsToTemplate(args)} linear (selectedIndexChange)='index = $event' [save]='saveData'>
    <cdk-step>
      <div style='line-height: 40px;'>
        Some <br> long <br>  step <br>  that <br>  does <br>  not <br>  have a  <br> form
      </div>
    </cdk-step>
    <sg-step><sg-step-demo-1></sg-step-demo-1></sg-step>
    <sg-step><sg-step-demo-3></sg-step-demo-3></sg-step>
    <sg-step><sg-step-demo-2></sg-step-demo-2></sg-step>
    <cdk-step>Bye</cdk-step>
  </sg-steps>
</section>`,
  }),
};

export default meta;
type Story = StoryObj<StepsComponent<Person>>;

export const Default: Story = {
  args: {},
};
