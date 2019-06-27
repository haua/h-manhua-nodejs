/**
 * 记录日志，简单的记录日志方法
 *
 * 会根据配置来决定是否记录日志，以什么方式保存日志
 * */
'use strict'
const path = require('path')
const moment = require('moment')
const config = require('../config')
const hFs = require('./h/fs')
const hStr = require('./h/string')

const logTo = config.logger && config.logger.logTo

// 在这里控制把日志存到哪个地方
const logBase = function (logTo, mark, ...args) {
  const now = moment().format('YYYY-MM-DD HH:mm:ss')
  switch (logTo) {
    case 'console':
      console.log(now, ` [${mark}] `, ...args)
      break
    case 'file': {
      const { fileName = 'log', splitByDay = true } = config.logger

      // 按天分隔
      setTimeout(async () => {
        const file = splitByDay ? `${fileName}-${console.now().format('YYYYMMDD')}.log` : `${fileName}.log`
        await saveToFile(path.join(__dirname, '../logs', file), now, mark, args)
      })
      break }
    default:
      setTimeout(async () => {
        await saveToFile(logTo, now, mark, args)
      })
  }
}

async function saveToFile (filePath, now, mark, args) {
  const res = await hFs.mkdir(hFs.getPath(filePath))
  if (!res) {
    console.error(`日志存储失败，无法创建文件夹：${hFs.getPath(filePath)}`)
    return
  }
  await hFs.writeFile(filePath, [ now, ` [${mark}] `, ...args.map(a => (typeof a === 'string' ? a : hStr.jsonEncode(a))), '\n' ].join(' '), {
    flag: 'a'
  })
}

const red = function (s) {
  return '\x1b[1;31m' + s + '\x1b[m'
}

module.exports = class Logger {
  constructor (prefix, file) {
    this.prefix = prefix || ''
    this.logTo = file || logTo
  }

  log (...args) {
    if (!config.logger) return
    logBase(this.logTo, 'log', ` [${this.prefix}] `, ...args)
  }

  error (...args) {
    if (!config.logger) return
    logBase(this.logTo, red('error'), ` [${red(this.prefix)}] `, ...args)
  }

  static log (...args) {
    if (!config.logger) return
    logBase(logTo, 'log', ...args)
  }

  static error (...args) {
    if (!config.logger) return
    logBase(logTo, red('error'), ...args)
  }
}
