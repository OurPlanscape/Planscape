import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SelectableListComponent } from './selectable-list.component';

interface DemoInterface {
  id: number;
  name: string;
  color: string;
  otherProperty?: string;
}

const items: DemoInterface[] = [
  { id: 1, name: 'First Item', color: '#123d81' },
  {
    id: 2,
    name: 'Some very long name that its going to wrap at some point but still should look good',
    color: '#1b86e4',
  },
  {
    id: 3,
    name: 'Another one that is going to be super long and then probably wrap and make it into more than two lines probably 3',
    color: '#4854c0',
  },
  { id: 4, name: 'Fourth Item', color: '#7946e6' },
];

const meta: Meta<DemoInterface> = {
  title: 'Components/Selectable List',
  component: SelectableListComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div style='width: 400px;'><sg-selectable-list ${argsToTemplate(args)}></sg-selectable-list></div>`,
  }),
};

export default meta;
type Story = StoryObj<SelectableListComponent<DemoInterface>>;

export const Default: Story = {
  args: {
    items: items,
  },
};
