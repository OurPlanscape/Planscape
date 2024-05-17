import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';
import { InputFieldComponent } from './input-field.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { InputDirective } from './input.directive';

type InputAndCustomArgs = InputFieldComponent & { placeholder: string };

/**
 * This component provides a wrapper to a native input element.
 *
 * Expects an input[sgInput] element via content projection.
 * The configuration of the input field (like formatting/validation/placeholders) is done
 * on the input field itself.
 *
 * ```
 * // use with regular forms
 * <sg-input-field>
 *   <input sgInput placeholder="..."  value="...">
 * </sg-input-field>
 *
 * // use with reactive forms
 * <sg-input-field>
 *   <input sgInput formControlName="...">
 * </sg-input-field>
 *
 * ```
 */
const meta: Meta<InputAndCustomArgs> = {
  title: 'Components/Input Field',
  component: InputFieldComponent,
  tags: ['autodocs'],

  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({ imports: [InputDirective] }),
  ],
  render: ({ placeholder, ...args }) => ({
    props: args,
    template: `
     <sg-input-field ${argsToTemplate(args)}>
     <input sgInput  placeholder='${placeholder}' [disabled]='${args.disabled}'>
</sg-input-field>
`,
  }),
};

export default meta;
type Story = StoryObj<InputAndCustomArgs>;

export const Default: Story = {
  args: {
    disabled: false,
    error: false,
    suffix: '',
    supportMessage: 'Support Message',
    trailingIcon: '',
    placeholder: 'Enter Amount',
  },
};

export const WithIcon: Story = {
  args: {
    leadingIcon: 'calendar_month',
    disabled: false,
    error: false,
    supportMessage: 'Enter whatever you like',
    placeholder: 'MM/DD/YYYY',
  },
};

export const WithSuffix: Story = {
  args: {
    leadingIcon: 'attach_money',
    suffix: '/acre',
    disabled: false,
    error: false,
    supportMessage: 'Price per acre',
    placeholder: 'Enter Amount',
  },
};

/**
 * Displays the support message only when on error state.
 *
 */
export const SupportMessage: Story = {
  args: {
    disabled: false,
    error: false,
    supportMessage: 'Support Message',
  },
  parameters: {
    controls: { include: ['error', 'supportMessage'] },
  },
  render: ({ placeholder, ...args }) => ({
    props: args,
    template: `
<div style='display: flex; flex-direction: column; gap: 16px'>
<h3>Support Message</h3>
    <p>Support message can be displayed always, on error, or false.</p>
    <sg-input-field ${argsToTemplate(args)} showSupportMessage='always'>
      <input sgInput  placeholder='Shows always' [disabled]='${args.disabled}'>
    </sg-input-field>
    <sg-input-field ${argsToTemplate(args)} showSupportMessage='on-error'>
      <input sgInput  placeholder='Shows on error' [disabled]='${args.disabled}'>
    </sg-input-field>
    <sg-input-field ${argsToTemplate(args)}  showSupportMessage='false'>
      <input sgInput  placeholder='Does not show support message' [disabled]='${args.disabled}'>
    </sg-input-field>
</div>

`,
  }),
};

export const Highlighted: Story = {
  args: {
    leadingIcon: 'attach_money',
    suffix: '/acre',
    disabled: false,
    error: false,
    supportMessage: 'Price per acre',
    placeholder: 'Enter Amount',
    highlighted: true,
  },
};
