export class ErrorResponse extends Error {
  public statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

export class BadRequestError extends ErrorResponse {
  constructor({ message = 'Bad Request', statusCode = 400 }: { message?: string; statusCode?: number } = {}) {
    super(message, statusCode)
  }
}

export class AuthRequestError extends ErrorResponse {
  constructor(message: string = 'Authentication error', statusCode: number = 401) {
    super(message, statusCode)
  }
}

export class NotFoundRequestError extends ErrorResponse {
  constructor(message: string = 'Not found', statusCode: number = 404) {
    super(message, statusCode)
  }
}

export class ForbiddenRequestError extends ErrorResponse {
  constructor(message: string = 'Forbidden', statusCode: number = 403) {
    super(message, statusCode)
  }
}

export class ConflictError extends ErrorResponse {
  constructor(message: string = 'Conflict', statusCode: number = 409) {
    super(message, statusCode)
  }
}
