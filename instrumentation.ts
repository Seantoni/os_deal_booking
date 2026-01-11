/**
 * Instrumentation file for Next.js
 * 
 * This file is used to initialize monitoring and observability tools
 * when the Next.js server starts up.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import server config for Node.js runtime
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Import edge config for Edge runtime
    await import('./sentry.edge.config')
  }
}

/**
 * Called when an error is captured in Server Components or Server Actions
 */
export const onRequestError = async (
  err: Error,
  request: {
    path: string
    method: string
    headers: Record<string, string>
  },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: 'render' | 'route' | 'action' | 'middleware'
    renderSource?: 'react-server-components' | 'react-server-components-payload' | 'server-rendering'
    revalidateReason?: 'on-demand' | 'stale'
    renderType?: 'dynamic' | 'dynamic-resume'
  }
) => {
  // Import Sentry dynamically to avoid issues
  const Sentry = await import('@sentry/nextjs')
  
  Sentry.captureException(err, {
    extra: {
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
    },
    tags: {
      routeType: context.routeType,
      routerKind: context.routerKind,
    },
  })
}
