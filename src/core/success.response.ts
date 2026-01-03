import { Response } from 'express'

export class SuccessResponse {
  message: string
  statusCode: number
  metaData: object

  constructor({
    message = 'Success',
    statusCode = 200,
    metaData = {}
  }: {
    message?: string
    statusCode?: number
    metaData?: object
  }) {
    this.message = message
    this.statusCode = statusCode
    this.metaData = metaData
  }

  send(res: Response) {
    res.status(this.statusCode).json(this)
  }
}

export class OK extends SuccessResponse {
  constructor({ message = 'OK', metaData = {} }: { message?: string; metaData?: object }) {
    super({
      message,
      statusCode: 200,
      metaData
    })
  }
}

export class CREATED extends SuccessResponse {
  constructor({ message = 'Created', metaData = {} }: { message?: string; metaData?: object }) {
    super({
      message,
      statusCode: 201,
      metaData
    })
  }
}

export class NO_CONTENT extends SuccessResponse {
  constructor({ message = 'No Content' }: { message?: string } = {}) {
    super({
      message,
      statusCode: 204,
      metaData: {}
    })
  }
}
