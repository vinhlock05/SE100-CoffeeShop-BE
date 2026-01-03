import { RequestHandler, Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import { MulterError } from 'multer'
import { ErrorResponse, NotFoundRequestError } from '~/core/error.response'

// Transform to async await for controller
export const wrapRequestHandler = <P = any>(handler: RequestHandler<P>) => {
  return (req: Request<P>, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

// Handle Error for all project
export const errorHandler: ErrorRequestHandler = (
  err: ErrorResponse | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err instanceof ErrorResponse ? err.statusCode : 500
  let message = err.message || 'Internal Server Error'

  // Handle error in multer upload image
  if (err instanceof MulterError && err.message == 'Unexpected field') {
    message = 'Image file or type is invalid, or number of image upload exceeds max allowed!'
    statusCode = 400
  }

  res.status(statusCode).json({
    status: 'Error',
    code: statusCode,
    message: message
  })

  console.log(`[err]: ${err.message}, \n[stack]: ${err.stack}`)

  return
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  throw new NotFoundRequestError(`Route ${req.method} ${req.originalUrl} not found`)
}
