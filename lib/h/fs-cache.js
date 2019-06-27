/**
 * 基于文件系统的缓存
 * */

const path = require('path')
const hFs = require('./fs')

// const logger = new (require('../log'))('文件缓存')

// 如果用到 fileCache 方法，这个配置是修改文件放哪的，填的是相对于本文件的路径，是不是/结尾都行
const fileDataDir = '../../data/' // 数据文件，没有过期时间的就是数据文件
const fileCacheDir = '../../cache/' // 缓存文件
// const fileCacheSalt = 'fge2ws3sa45fe64wqd' // 盐，一个随机字符串即可，但定义了就不能修改了，否则读不到修改前的缓存。是为了让缓存文件名不容易被看到
// const aesKey = '' // 缓存内容是否加密，填了加密key则用 aes-128-cbc 加密，不填则不加密，同样是定义了就不能改了。除非以前的缓存都不要了

// 先不要md5了，对排错不方便
// const crypto = require('crypto')
// const md5 = (str) => crypto.createHash('md5').update(str.toString()).digest('hex')

const fileDir = (name, type, dir) => path.join(__dirname, dir || fileCacheDir, encodeURIComponent(`${type}-${name}`))

module.exports = {
  /**
   * 利用文件做缓存
   * @param name
   * @param data 不传，或传 undefined 表示查询模式。传 null 表示删除模式，其他均是存储模式
   * @param expire 过期时间，单位秒。不设，或为0，表示存储的数据无过期时间
   * @return boolean|mixed 查询模式，它是什么就是什么，不存在则是 undefined
   *                       删除模式和存储模式则返回操作成功还是失败，布尔值。
   *                       删除不存在的key会返回fasle
   *                       重复存储已存在的key，也能成功
   * */
  async cache (name, data, expire) {
    return this.saveFileBase(name, data, expire, fileCacheDir)
  },

  /**
   * 跟上面是一样的逻辑，只是这个会存在data文件夹
   * */
  async data (name, data) {
    return this.saveFileBase(name, data, 0, fileDataDir)
  },

  async saveFileBase (name, data, expire, dir) {
    const filePath = fileDir(name, 'STRING', dir)
    if (data === undefined) { // 查
      try {
        data = await hFs.readFile(filePath)
        data = JSON.parse(data)
      } catch (e) {}
      if (data && data.expireTime && data.expireTime < Date.now()) {
        hFs.unlink(filePath).then()
        return undefined
      }
      return data && data.data
    } else if (data === null) { // 删
      return hFs.unlink(filePath)
    } else { // 存
      try {
        const now = Date.now()
        const expireTime = expire ? (now + parseInt(expire) * 1000) : 0
        let saveData = JSON.stringify({
          data: data,
          saveTime: now,
          expireTime: isNaN(expireTime) ? 0 : expireTime
        })
        return hFs.saveFile(filePath, saveData)
      } catch (e) {
        console.error('[hFs error]', { name, data, expire }, e.stack)
      }
      return false
    }
  },

  /* ----------
   * 列表型
   * ----------
   *
   * 有时候需要存一个很长的数组，用上面那种方式可能会造成内存溢出，所以，下面的方法对这类的缓存做了优化
   *
   * ps. 这种类型不能设置过期时间，而且存储的位置会放到数据文件夹
   * */

  /**
   * 给列表添加元素
   *
   * @param name string 如果列表不存在会创建列表并添加数据
   * @param data mixed 会加入到数组中的最后
   * @return boolean
   * */
  async listAdd (name, data) {
    const filePath = fileDir(name, 'LIST', fileDataDir)
    return hFs.writeFileByLine(filePath, JSON.stringify(data))
  },

  /**
   * 给列表添加元素
   *
   * @param name string 如果列表不存在会创建列表并添加数据
   * @param datas array 会加入到数组中的最后
   * @return boolean
   * */
  async listAddMult (name, datas) {
    const filePath = fileDir(name, 'LIST', fileDataDir)
    return hFs.writeFileByLines(filePath, datas.map(data => JSON.stringify(data)))
  },

  /**
   * 遍历
   *
   * ps1. 如果缓存不存在，则一次不会回调，直接return false
   * ps2. 可以await此方法，则会等到遍历完成后才 return
   *
   * @param name
   * @param fn function 可以是 async 函数，会等到此函数执行完才return
   * @return bool 如果是缓存读取失败会返回false，否则是true
   * */
  async listEach (name, fn) {
    const filePath = fileDir(name, 'LIST', fileDataDir)
    return hFs.readFileByLine(filePath, fn)
  },

  /**
   * 删除列表
   * */
  async listDel (name) {
    const filePath = fileDir(name, 'LIST', fileDataDir)
    return hFs.unlink(filePath)
  }
}
