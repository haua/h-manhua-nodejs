// 控制器进出debug

module.exports = options => {
  return async function log (ctx, next) {
    const { logger } = ctx
    logger.info('web-in')
    const start = Date.now()
    await next()
    logger.info(`${Date.now() - start}ms`)
  }
}
