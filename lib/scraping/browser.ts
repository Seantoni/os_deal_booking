/**
 * Browser Helper for Puppeteer
 * 
 * Handles browser initialization for both local development and Vercel serverless.
 * Uses puppeteer-core + @sparticuz/chromium for Vercel compatibility.
 * Includes manual stealth evasions to bypass bot detection (Cloudflare, etc.)
 * 
 * Using v131 which is the last version compatible with Amazon Linux 2 (Vercel's runtime).
 * Newer versions (137+) require Amazon Linux 2023 which Vercel doesn't support yet.
 */

import puppeteer, { Browser, Page } from 'puppeteer-core'

// Cache the browser instance for reuse within the same invocation
let browserInstance: Browser | null = null

/**
 * Check if we're running in a serverless environment (Vercel)
 */
function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

/**
 * Get the executable path for Chromium
 * - On Vercel: Use @sparticuz/chromium (bundled with binary)
 * - Locally: Use system Chrome/Chromium
 */
async function getExecutablePath(): Promise<string> {
  if (isServerless()) {
    // Dynamic import to avoid bundling issues
    const chromium = await import('@sparticuz/chromium')
    console.log(`[Browser] Chromium module loaded, getting executable path...`)
    
    const execPath = await chromium.default.executablePath()
    console.log(`[Browser] Chromium executable path: ${execPath}`)
    
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
    const chromium = await import('@sparticuz/chromium')
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
 * Create a new page with optimized settings and stealth evasions
 */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage()
  
  // Set realistic user agent (Chrome on Windows)
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )
  
  // Set additional headers to appear more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  })
  
  // Override webdriver detection (additional layer on top of stealth plugin)
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver flag
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    })
    
    // Add Chrome runtime
    // @ts-expect-error - Chrome-specific property
    window.chrome = {
      runtime: {},
    }
    
    // Override permissions query
    const originalQuery = window.navigator.permissions.query
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'denied', onchange: null } as PermissionStatus)
      }
      return originalQuery(parameters)
    }
    
    // Add plugins array (headless Chrome has empty plugins)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    })
    
    // Add languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en', 'es'],
    })
  })
  
  // Block unnecessary resources to speed up loading and reduce memory
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const resourceType = request.resourceType()
    if (['font', 'media', 'image'].includes(resourceType)) {
      request.abort()
    } else {
      request.continue()
    }
  })
  
  return page
}

