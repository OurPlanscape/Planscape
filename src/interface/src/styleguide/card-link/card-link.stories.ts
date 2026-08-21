import type { Meta, StoryObj } from '@storybook/angular';
import { CardLinkComponent } from './card-link.component';

const meta: Meta<CardLinkComponent> = {
  title: 'Cards/Card Link',
  component: CardLinkComponent,
  tags: ['autodocs'],
  argTypes: {
    showFooter: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
    subLabel: {
      control: 'text',
    },
    height: {
      control: 'select',
      options: ['normal', 'tall'],
    },
    navigate: {
      action: 'navigate',
    },
  },
};

export default meta;

type Story = StoryObj<CardLinkComponent>;

export const Default: Story = {
  args: {
    showFooter: true,
    label: 'Map Viewer',
    subLabel: 'View & upload data',
    height: 'normal',
  },
  render: (args) => ({
    props: args,
    template: `
      <sg-card-link
        [showFooter]="showFooter"
        [label]="label"
        [subLabel]="subLabel"
        [height]="height"
        (navigate)="navigate($event)"
      >
        <div
          cardContent
          style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e5e5e5;
          "
        >
          Card content
        </div>
      </sg-card-link>
    `,
  }),
};

export const Tall: Story = {
  args: {
    ...Default.args,
    height: 'tall',
  },
  render: Default.render,
};

export const WithoutSubLabel: Story = {
  args: {
    showFooter: true,
    label: 'Map Viewer',
    subLabel: null,
    height: 'normal',
  },
  render: Default.render,
};

export const WithoutFooter: Story = {
  args: {
    showFooter: false,
    label: null,
    subLabel: null,
    height: 'normal',
  },
  render: Default.render,
};
