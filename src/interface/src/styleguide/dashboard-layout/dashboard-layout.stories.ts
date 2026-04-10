import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { DashboardLayoutComponent } from './dashboard-layout.component';

const meta: Meta<DashboardLayoutComponent> = {
  title: 'Components/Dashboard Layout',
  component: DashboardLayoutComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [CommonModule, DashboardLayoutComponent],
    }),
  ],
};

export default meta;

type Story = StoryObj<DashboardLayoutComponent>;

const leftItems = Array.from({ length: 31 }, () => 'Left column content');
const rightItems = Array.from({ length: 26 }, () => 'Right column content');

const createStory = (
  layoutVariant: 'default' | 'disable-right-scroll',
  withHeader = false
) => ({
  props: {
    leftItems,
    rightItems,
    withHeader,
    layoutVariant,
  },
  template: `
    <div style="height: 250px">
      <sg-dashboard-layout [layoutVariant]="layoutVariant">
        <div *ngIf="withHeader" header>
          <h3
            style="
              margin: 0;
              background: #dddddd;
              padding: 8px;
              border-radius: 8px;
            ">
            Title bar
          </h3>
        </div>

        <div left-column>
          <h4
            *ngFor="let item of leftItems"
            style="margin-top: 0;">
            {{ item }}
          </h4>
        </div>

        <div right-column>
          <h4
            *ngFor="let item of rightItems"
            style="margin-top: 0;">
            {{ item }}
          </h4>
        </div>
      </sg-dashboard-layout>
    </div>
  `,
});

export const WithHeader: Story = {
  render: () => createStory('default', true),
};

export const WithoutHeader: Story = {
  render: () => createStory('default', false),
};

export const DisableRightColumnScroll: Story = {
  render: () => createStory('disable-right-scroll', true),
};
