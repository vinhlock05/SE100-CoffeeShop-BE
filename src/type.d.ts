import { Request, Response, NextFunction } from 'express'

// Token types
export interface DecodedToken {
  userId: number
  tokenType: string
  iat: number
  exp: number
}

// Express type declaration extension
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        username: string
        fullName?: string  // Optional - from linked Staff
        roleId: number
        status: string
        permissions: string[]
        staffId?: number   // Optional - ID của Staff nếu user liên kết với Staff
      }
      decodedToken?: DecodedToken
      refreshToken?: string
    }
  }
}

export {}

