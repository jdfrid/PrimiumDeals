/**
 * Image Generator Service
 * Converts HTML banners to PNG images using Puppeteer
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class ImageGenerator {
  constructor() {
    this.browser = null;
    this.imagesDir = path.join(process.cwd(), 'public', 'banner-images');
    
    // Ensure images directory exists
    if (!fs.existsSync(this.imagesDir)) {
      fs.mkdirSync(this.imagesDir, { recursive: true });
    }
  }

  async getBrowser() {
    if (!this.browser) {
      console.log('🌐 Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Generate PNG image from HTML banner
   */
  async generateImage(html, width, height, filename) {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set viewport to banner size
      await page.setViewport({ width, height });
      
      // Load HTML content
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(img => new Promise(resolve => {
              img.onload = img.onerror = resolve;
            }))
        );
      });
      
      // Take screenshot
      const imagePath = path.join(this.imagesDir, `${filename}.png`);
      await page.screenshot({
        path: imagePath,
        type: 'png',
        clip: { x: 0, y: 0, width, height }
      });
      
      await page.close();
      
      console.log(`✅ Generated image: ${filename}.png`);
      return imagePath;
    } catch (error) {
      console.error('Image generation error:', error.message);
      throw error;
    }
  }

  /**
   * Generate image buffer (for direct upload to Telegram)
   */
  async generateImageBuffer(html, width, height) {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      await page.setViewport({ width, height });
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Wait for images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(img => new Promise(resolve => {
              img.onload = img.onerror = resolve;
            }))
        );
      });
      
      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width, height }
      });
      
      await page.close();
      return buffer;
    } catch (error) {
      console.error('Image buffer generation error:', error.message);
      throw error;
    }
  }

  /**
   * Close browser when done
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export default new ImageGenerator();

