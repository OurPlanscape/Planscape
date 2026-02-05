import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayLoaderComponent } from './overlay-loader.component';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';

@Component({
  selector: 'sg-demo-overlay-loader',
  standalone: true,
  imports: [CommonModule, OverlayLoaderComponent],
  styles: ``,
  template:
    '<button (click)="openModal()">{{label}}</button><sg-overlay-loader *ngIf="open" [offsetTop]="offset"></sg-overlay-loader>',
})
class DemoOverlayLoaderComponent {
  @Input() open = false;
  @Input() offset = 0;
  @Input() label = '';

  openModal() {
    this.open = true;
    setTimeout(() => (this.open = false), 5000);
  }
}

const meta: Meta<OverlayLoaderComponent> = {
  title: 'Components/Overlay Loader',
  component: OverlayLoaderComponent,
  decorators: [moduleMetadata({ imports: [DemoOverlayLoaderComponent] })],
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `
<div style='height: 400px; background-color: #8e918f; padding: 20px'>This overlay uses position fixed, and in the app should cover the whole page. The demo here on storybook will only cover the story itself. </div>
<sg-demo-overlay-loader label='Open Overlay Loader and close in 5 seconds'></sg-demo-overlay-loader>
<sg-demo-overlay-loader label='Open Overlay with offset at top' [offset]='100'></sg-demo-overlay-loader>`,
  }),
};

export default meta;
type Story = StoryObj<OverlayLoaderComponent>;

export const Default: Story = {
  args: {},
};
