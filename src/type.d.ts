import { Request, Response, NextFunction } from 'express'

// Express type declaration extension
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        username: string
        roleId: number
        role?: string
      }
    }
  }
}

export {}
