import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { ProjectAreaExpanderComponent } from './project-area-expander.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const containerStyle = `style="display: flex;
  width: 100%;
  height: 180px;
  background-color: lightgray;
  align-items: center;
  justify-content: start;
  padding: 10px;
  flex-direction: column;"`;

const meta: Meta<ProjectAreaExpanderComponent> = {
  title: 'Components/Project Area Expander',
  component: ProjectAreaExpanderComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  tags: ['autodocs'],
  render: ({ ...args }) => ({
    props: args,
    template: `<div ${containerStyle}><div style="width:400px;"><sg-project-area-expander ${argsToTemplate(args)}></sg-project-area-expander></div>`,
  }),
};

export default meta;
type Story = StoryObj<ProjectAreaExpanderComponent>;

export const Default: Story = {
  args: {
    title: 'Project Area 1',
    treatments: [{ type: 'MODERATE_THINNING_BURN' }, {}],
  },
};
