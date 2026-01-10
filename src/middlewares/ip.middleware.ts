import { Request, Response, NextFunction } from 'express'
import { ForbiddenRequestError } from '~/core/error.response'

export const checkIPMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Get Allowed IPs from env
  const allowedIpsStr = process.env.ALLOWED_IPS || ''
  if (!allowedIpsStr) {
    // If no IP configured, warn log? Or allow all? 
    // Security best practice: If config missing, deny all or allow all based on requirement.
    // Here assume allow all for dev, or block. Let's allow all if NOT SET in dev, but in prod should be set.
    // User requested "simple env var", so let's stick to strict check if var exists.
    // If empty string -> maybe skip check?
    // Let's implement: if var empty => Allow all (development convenience).
    return next()
  }

  const allowedIps = allowedIpsStr.split(',').map(ip => ip.trim())

  // 2. Get Client IP
  // req.headers['x-forwarded-for'] is standard for proxies (Nginx/Docker)
  // req.socket.remoteAddress is direct connection
  let clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || ''
  
  // Handle IPv6 format "::ffff:127.0.0.1"
  if (clientIp.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7)
  }

  // Handle multiple IPs in x-forwarded-for (e.g. "client, proxy1, proxy2")
  if (clientIp.includes(',')) {
    clientIp = clientIp.split(',')[0].trim()
  }

  console.log(`[IP Check] Client: ${clientIp} | Allowed: ${allowedIps}`)

  // 3. Validation
  if (allowedIps.includes(clientIp)) {
    return next()
  }

  throw new ForbiddenRequestError('Bạn đang không sử dụng mạng Internet của cửa hàng!')
}
