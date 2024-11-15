import pino from 'pino'

const enabledEnv = process.env.LOG_ENABLED
const enabled: boolean = true

const level = process.env.LOG_LEVEL || 'info'

const config = {
  enabled,
  level,
}
const x = process.env.LOG_DESTINATION

export const logger = process.env.LOG_DESTINATION
  ? pino(config, pino.destination(`${process.env.LOG_DESTINATION}${Math.random().toString()
    .substring(0, 5)}.log`))
  : pino(config)
