import puppeteerCore from "puppeteer-core";

/**
 * Generate a PDF from a URL using Puppeteer
 * Uses @sparticuz/chromium for Vercel serverless, or local Chrome for development
 *
 * @param {string} url - The full URL to render as PDF
 * @returns {Promise<Buffer>} - PDF buffer
 */
export async function generatePdf(url) {
  let browser;

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // Local development - use installed Chrome
    const executablePath = process.platform === "win32"
      ? "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome";

    browser = await puppeteerCore.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  } else {
    // Production (Vercel) - use @sparticuz/chromium
    const chromium = await import("@sparticuz/chromium");
    browser = await puppeteerCore.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });
  }

  try {
    const page = await browser.newPage();

    // Navigate to the URL and wait for network to be idle
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000
    });

    // Hide print controls before generating PDF
    await page.evaluate(() => {
      // Hide elements with print:hidden class
      const printHiddenElements = document.querySelectorAll(".print\\:hidden");
      printHiddenElements.forEach(el => {
        el.style.display = "none";
      });
    });

    // Generate PDF with A4 settings
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm"
      }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
