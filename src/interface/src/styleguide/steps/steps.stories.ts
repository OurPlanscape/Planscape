import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';

import { provideAnimations } from '@angular/platform-browser/animations';
import { Step, StepsComponent } from './steps.component';
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

// interface just for testing
interface Person {
  name: string;
  age: number;
  email?: string;
}

@Component({
  selector: 'sg-step-demo-1',
  template: `
    <form [formGroup]="form">
      <div>Enter "fail" for validation to fail</div>
      Name : <input type="text" id="name" formControlName="name" />
      <div *ngIf="!form.valid && form.dirty">not valid</div>
      <div *ngIf="form.hasError('invalid') && form.dirty">
        {{ form.getError('invalid') }}
      </div>
    </form>
  `,
})
class MyStep1Component implements Step {
  form: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
  });
}

@Component({
  selector: 'sg-step-demo-2',
  template: `
    <form [formGroup]="form">
      Age : <input type="text" id="name" formControlName="age" />
      <div *ngIf="!form.valid && form.dirty">not valid</div>
    </form>
  `,
})
class MyStep2Component implements Step {
  form: FormGroup = new FormGroup({
    age: new FormControl('', Validators.required),
  });
}

@Component({
  selector: 'sg-step-demo-3',
  template: `
    <form [formGroup]="form">
      email (optional) :
      <input type="text" id="email" formControlName="email" />
      <div *ngIf="!form.valid && form.dirty">not valid</div>
    </form>
  `,
})
class MyStep3Component implements Step {
  form: FormGroup = new FormGroup({
    email: new FormControl('', Validators.email),
  });
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
      imports: [CommonModule, CdkStepperModule, ReactiveFormsModule],
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
    <cdk-step [stepControl]='step1.form'><sg-step-demo-1 #step1></sg-step-demo-1></cdk-step>
    <cdk-step [stepControl]='step3.form'><sg-step-demo-3 #step3></sg-step-demo-3></cdk-step>
    <cdk-step [stepControl]='step2.form'><sg-step-demo-2 #step2></sg-step-demo-2></cdk-step>
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
