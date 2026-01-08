import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '~/config/env'
import { TokenType } from '~/enums/tokenType.enum'

/**
 * Hash password with bcrypt
 */
export const hashData = (data: string): string => {
  return bcrypt.hashSync(data, 10)
}

/**
 * Compare plain text with hashed data
 */
export const compareHash = async (plain: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plain, hashed)
}

/**
 * Sign a JWT token
 */
export const signToken = (payload: object, secretKey: string, options?: SignOptions): Promise<string> => {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secretKey, { ...options, algorithm: 'HS256' }, (err, token) => {
      if (err) reject(err)
      resolve(token as string)
    })
  })
}

/**
 * Sign an access token (short-lived)
 */
export const signAccessToken = async (userId: number): Promise<string> => {
  return signToken(
    { userId, tokenType: TokenType.ACCESS_TOKEN },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as any }
  )
}

/**
 * Sign a refresh token (long-lived)
 */
export const signRefreshToken = async (userId: number): Promise<string> => {
  return signToken(
    { userId, tokenType: TokenType.REFRESH_TOKEN },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any }
  )
}

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string, secretKey: string): jwt.JwtPayload => {
  return jwt.verify(token, secretKey) as jwt.JwtPayload
}

/**
 * Decoded token payload type
 */
export interface DecodedToken {
  userId: number
  tokenType: TokenType
  iat: number
  exp: number
}
