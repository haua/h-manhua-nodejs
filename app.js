const config = require('./config')

// https://eggjs.org/zh-cn/basics/app-start.html
class AppBootHook {
  constructor (app) {
    this.app = app
  }

  configWillLoad () {
    // 设置这个配置，让其它拿不到app的地方也能获取到config，减少代码对框架的耦合度
    config.setConfig(this.app.config)
  }

  willReady () {
    // 所有的插件都已启动完毕，但是应用整体还未 ready
    // 可以做一些数据初始化等操作，这些操作成功才会启动应用
    // 也可以去配置中心读数据库配置等。
  }

  // 应用启动完成
  serverDidReady () {
    console.log('启动成功')
    // this.app.server.on('timeout', socket => {
    //   // handle socket timeout
    //   console.error('错误：', 'server timeout')
    // })
  }
}

module.exports = AppBootHook
