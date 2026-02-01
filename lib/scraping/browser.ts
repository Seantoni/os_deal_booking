/**
 * Browser Helper for Puppeteer
 * 
 * Handles browser initialization for both local development and Vercel serverless.
 * Uses puppeteer-core + @sparticuz/chromium-min for Vercel compatibility.
 * chromium-min downloads the browser binary at runtime from a remote URL.
 * 
 * Critical fixes for Vercel serverless:
 * 1. Set AWS_LAMBDA_JS_RUNTIME before chromium module loads
 * 2. Set LD_LIBRARY_PATH to chromium executable directory (for libnspr4.so)
 * 3. Disable graphics mode to prevent freezing
 */

import puppeteer, { Browser } from 'puppeteer-core'
import * as path from 'path'

// Cache the browser instance for reuse within the same invocation
let browserInstance: Browser | null = null

/**
 * Check if we're running in a serverless environment (Vercel)
 */
function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

/**
 * Get the executable path for Chromium and configure serverless environment
 * - On Vercel: Use @sparticuz/chromium-min (downloads binary at runtime)
 * - Locally: Use system Chrome/Chromium
 * 
 * CRITICAL: Sets LD_LIBRARY_PATH so Chromium can find shared libraries (libnspr4.so, libnss3.so)
 */
async function getExecutablePath(): Promise<string> {
  if (isServerless()) {
    // Set AWS_LAMBDA_JS_RUNTIME fallback (should also be in Vercel Dashboard)
    if (!process.env.AWS_LAMBDA_JS_RUNTIME) {
      process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x'
      console.log(`[Browser] Set AWS_LAMBDA_JS_RUNTIME=nodejs22.x`)
    }
    
    // Dynamic import to avoid bundling issues
    const chromium = await import('@sparticuz/chromium-min')
    console.log(`[Browser] Chromium-min module loaded, getting executable path...`)
    
    // Disable graphics mode to prevent freezing in serverless (no GPU support)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromiumDefault = chromium.default as any
    if (typeof chromiumDefault.setGraphicsMode === 'function') {
      chromiumDefault.setGraphicsMode(false)
      console.log(`[Browser] Graphics mode disabled`)
    }
    
    // chromium-min downloads the binary from a remote URL
    // Using the official sparticuz chromium pack hosted on GitHub releases
    const execPath = await chromiumDefault.executablePath(
      'https://github.com/nicholasgriffintn/chromium-binaries-for-serverless/releases/download/v134.0.0/chromium-v134.0.0-pack.tar'
    )
    console.log(`[Browser] Chromium executable path: ${execPath}`)
    
    // CRITICAL: Set LD_LIBRARY_PATH so Chromium can find shared libraries
    // This fixes the "libnspr4.so: cannot open shared object file" error
    const execDir = path.dirname(execPath)
    process.env.LD_LIBRARY_PATH = execDir
    console.log(`[Browser] Set LD_LIBRARY_PATH=${execDir}`)
    
    return execPath
  }
  
  // Local development - try common paths
  const possiblePaths = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ]
  
  // Try to find a working path
  const fs = await import('fs')
  for (const path of possiblePaths) {
    if (fs.existsSync(path)) {
      return path
    }
  }
  
  // If no Chrome found locally, throw an error
  throw new Error(
    'Chrome/Chromium not found. Please install Google Chrome or set PUPPETEER_EXECUTABLE_PATH'
  )
}

/**
 * Get browser launch arguments
 */
async function getBrowserArgs(): Promise<string[]> {
  const baseArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--single-process', // Important for serverless
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
  ]
  
  if (isServerless()) {
    // Dynamic import for serverless
    const chromium = await import('@sparticuz/chromium-min')
    // Use chromium's optimized args for serverless
    return [...chromium.default.args, ...baseArgs]
  }
  
  return [
    ...baseArgs,
    '--window-size=1280,800',
  ]
}

/**
 * Launch a browser instance
 * Reuses existing instance if available and not closed
 */
export async function getBrowser(): Promise<Browser> {
  // Check if we have a valid cached browser
  if (browserInstance && browserInstance.connected) {
    console.log(`[Browser] Reusing existing browser instance`)
    return browserInstance
  }
  
  const serverless = isServerless()
  console.log(`[Browser] Launching browser (serverless: ${serverless})`)
  console.log(`[Browser] Environment: VERCEL=${process.env.VERCEL}, AWS_LAMBDA=${process.env.AWS_LAMBDA_FUNCTION_NAME}`)
  
  let executablePath: string
  try {
    executablePath = await getExecutablePath()
    console.log(`[Browser] Using executable: ${executablePath}`)
  } catch (pathError) {
    console.error(`[Browser] Failed to get executable path:`, pathError)
    throw new Error(`Browser executable path error: ${pathError instanceof Error ? pathError.message : 'Unknown'}`)
  }
  
  const args = await getBrowserArgs()
  console.log(`[Browser] Launch args: ${args.length} arguments`)
  
  try {
    const browser = await puppeteer.launch({
      executablePath,
      args,
      headless: true, // Always use headless mode
      defaultViewport: { width: 1280, height: 800 },
    })
    
    console.log(`[Browser] Browser launched successfully`)
    browserInstance = browser
    
    // Clean up on close
    browser.on('disconnected', () => {
      console.log(`[Browser] Browser disconnected`)
      browserInstance = null
    })
    
    return browser
  } catch (launchError) {
    console.error(`[Browser] Failed to launch browser:`, launchError)
    throw new Error(`Browser launch error: ${launchError instanceof Error ? launchError.message : 'Unknown'}`)
  }
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close()
    } catch (error) {
      console.error('[Browser] Error closing browser:', error)
    } finally {
      browserInstance = null
    }
  }
}

/**
 * Create a new page with optimized settings
 */
export async function createPage(browser: Browser) {
  const page = await browser.newPage()
  
  // Set user agent to avoid bot detection
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )
  
  // Block unnecessary resources to speed up loading
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const resourceType = request.resourceType()
    // Block fonts, media, and some images to speed up
    if (['font', 'media'].includes(resourceType)) {
      request.abort()
    } else {
      request.continue()
    }
  })
  
  return page
}

