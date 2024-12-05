import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
    /**
   * Darkens a specified color by a given percentage.
   * @param hexColor The color in hexadecimal format (#RRGGBB).
   * @param percent The percentage by which to darken the color (0-100).
   * @returns The darkened color in hexadecimal format.
   */
    darkenColor(hexColor: string, percent: number): string {
      // Remove the '#' character if present
      hexColor = hexColor.replace('#', '');
  
      // Convert HEX to RGB
      const r = parseInt(hexColor.substring(0, 2), 16);
      const g = parseInt(hexColor.substring(2, 4), 16);
      const b = parseInt(hexColor.substring(4, 6), 16);
  
      // Calculate the darkness factor
      const factor = (100 - percent) / 100;
  
      // Apply the darkness factor to each color channel
      const newR = Math.floor(r * factor);
      const newG = Math.floor(g * factor);
      const newB = Math.floor(b * factor);
  
      // Convert back to HEX
      return (
        '#' +
        this.toHex(newR) +
        this.toHex(newG) +
        this.toHex(newB)
      );
    }

    /**
   * Converts a number to a 2-digit HEX format.
   * @param value A number between 0 and 255.
   * @returns A 2-character HEX string.
   */
    private toHex(value: number): string {
      const hex = value.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }
}
