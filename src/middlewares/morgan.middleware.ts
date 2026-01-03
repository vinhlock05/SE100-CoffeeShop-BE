import { Request } from 'express'
import morgan from 'morgan'
import chalk from 'chalk'

// Custom format for better log formatting
morgan.token('body', (req: Request) => {
  const body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body, null, 2) : '{}'
  return chalk.magentaBright(body)
})

morgan.token('query', (req: Request) => {
  const query = req.query && Object.keys(req.query).length ? JSON.stringify(req.query, null, 2) : '{}'
  return chalk.cyanBright(query)
})

// HTTP status icon with colors
morgan.token('status-icon', (req, res) => {
  const status = res.statusCode
  if (status >= 200 && status < 300) return chalk.green('✅') // 2xx: Success
  if (status >= 300 && status < 400) return chalk.blue('📤') // 3xx: Redirect
  if (status >= 400 && status < 500) return chalk.yellow('❌') // 4xx: Client error
  if (status >= 500) return chalk.red('🛑') // 5xx: Server error
  return chalk.white('ℹ️') // Others
})

// Morgan Middleware
export const morganMiddleware = morgan((tokens, req, res) => {
  return [
    chalk.bgBlueBright('\n==== REQUEST START ===='),
    `${chalk.bold('📌 Method:')} ${chalk.yellow(tokens.method(req, res))}`,
    `${tokens['status-icon'](req, res)} ${chalk.bold('Status:')} ${chalk.greenBright(tokens.status(req, res))}`,
    `${chalk.bold('🌐 URL:')} ${chalk.blue(tokens.url(req, res))}`,
    `${chalk.bold('⏳ Response Time:')} ${chalk.magenta(tokens['response-time'](req, res))} ms`,
    `${chalk.bold('📦 Body:')} ${tokens.body(req, res)}`,
    `${chalk.bold('🔍 Query:')} ${tokens.query(req, res)}`,
    chalk.bgRedBright('==== REQUEST END ====\n')
  ].join('\n')
})
