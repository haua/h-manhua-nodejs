/* eslint valid-jsdoc: "off" */

'use strict'

// add your user config here
const userConfig = {
  // myAppName: 'egg',
  sequelize: {
    dialect: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'h_manhua',
    define: {
      // prevent sequelize from pluralizing table names
      freezeTableName: true,
      underscored: true, // 定义在数据库中的字段是否使用下横线。开启后，model中的定义建议使用驼峰，这样查出来的字段会自动驼峰
      raw: true
    }
  },

  logger: { // logger为false就不会记录任何日志了
    logTo: 'console' // 日志输出到哪，默认是控制台
  },

  alinode: {
    server: 'wss://agentserver.node.aliyun.com:8080',
    appid: '80421',
    secret: '56302f8ce8a6cbe9caec7aaef15e6bc6dff246e7',
    logdir: '/home/haua/logs/alinode/'
  }
}

let appInf

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  if (appInfo) {
    appInf = appInfo
  } else if (appInf) {
    appInfo = appInf
  }
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {}

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1560869227341_3631'

  // add your middleware config here
  config.middleware = []

  return {
    ...config,
    ...userConfig
  }
}
