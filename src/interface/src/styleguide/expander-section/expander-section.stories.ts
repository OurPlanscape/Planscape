import type { Meta, StoryObj } from '@storybook/angular';
import { argsToTemplate } from '@storybook/angular';
import { ExpanderSectionComponent, OptionType } from '@styleguide';

const meta: Meta<ExpanderSectionComponent<OptionType>> = {
  title: 'Components/Expander Section',
  component: ExpanderSectionComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<sg-expander-section ${argsToTemplate(args)}></sg-expander-section>`,
  }),
};

export default meta;
type Story = StoryObj<ExpanderSectionComponent<string>>;

type StoryKeyValue = StoryObj<
  ExpanderSectionComponent<{ value: number; text: string }>
>;

export const Default: Story = {
  args: {
    title: 'Pick your color',
    options: ['black', 'red', 'blue', 'green'],
    defaultOption: 'red',
    groupName: 'options-colors',
  },
};

export const Open: Story = {
  args: {
    isOpen: true,
    title: 'Pick your size',
    options: ['small', 'medium', 'large', 'x-large'],
    defaultOption: 'small',
    groupName: 'options-pick-size',
  },
};

const options = [
  { value: 1, text: 'One' },
  { value: 2, text: 'Two' },
  { value: 3, text: 'Three' },
  { value: 4, text: 'Four' },
];

export const WithKeyValue: StoryKeyValue = {
  args: {
    isOpen: true,
    title: 'Pick your size',
    options: options,
    defaultOption: options[1],
    groupName: 'options-keyvalue',
  },
};
