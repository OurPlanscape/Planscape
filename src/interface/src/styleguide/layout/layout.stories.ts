import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { LayoutComponent } from './layout.component';

const meta: Meta<LayoutComponent> = {
  title: 'Components/Layout',
  component: LayoutComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [CommonModule, LayoutComponent],
    }),
  ],
};

export default meta;

type Story = StoryObj<LayoutComponent>;

const containerStyle = `
  style="
    height: 95vh;
    padding: 16px;
    background: #f5f5f5;
    box-sizing: border-box;
  "
`;

const boxStyle = `
  style="
    background: white;
    border: 1px solid #E1E1E1;
    border-radius: 8px;
    padding: 16px;
    box-sizing: border-box;
  "
`;

const scrollContent = Array.from({ length: 20 })
  .map(
    (_, index) =>
      `<div style="padding: 8px 0; border-bottom: 1px solid #E1E1E1;">Item ${index + 1}</div>`
  )
  .join('');

export const WithHeader: Story = {
  render: () => ({
    template: `
      <div ${containerStyle}>
        <sg-layout>
          <div header ${boxStyle}>
            <h3 style="margin: 0;">Sticky header</h3>
            <p style="margin: 8px 0 0 0;">This header should remain visible while the layout scrolls.</p>
          </div>

          <div left-column ${boxStyle}>
            <h4 style="margin-top: 0;">Left column</h4>
            ${scrollContent}
          </div>

          <div right-column ${boxStyle}>
            <h4 style="margin-top: 0;">Right column</h4>
            ${scrollContent}
          </div>
        </sg-layout>
      </div>
    `,
  }),
};

export const WithoutHeader: Story = {
  render: () => ({
    template: `
      <div ${containerStyle}>
        <sg-layout>
          <div left-column ${boxStyle}>
            <h4 style="margin-top: 0;">Left column</h4>
            ${scrollContent}
          </div>

          <div right-column ${boxStyle}>
            <h4 style="margin-top: 0;">Right column</h4>
            ${scrollContent}
          </div>
        </sg-layout>
      </div>
    `,
  }),
};
