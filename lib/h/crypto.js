/**
 * 简单封装一下nodejs自带的crypto
 * */
const logger = new (require('../log'))('hCryptp')
const crypto = require('crypto')

/**
 * 加盐的方法
 * */
const saltFn = [
  (str, salt) => {
    return `${str}+${salt}`
  }
]

module.exports = {
  /**
   * md5字符串
   * @param str string 原串
   * @param salt string 盐
   * @param saltFnIndex int 采用哪个加盐方法
   * */
  md5 (str, salt, saltFnIndex) {
    if (salt) {
      const addSaltFn = saltFn[saltFnIndex] || saltFn[0]
      str = addSaltFn(str, salt)
    }
    return crypto.createHash('md5').update(str.toString()).digest('hex')
  },

  sha1 (str) {
    return crypto.createHash('sha1').update(str.toString()).digest('hex')
  },

  /**
   * 微信小程序 biz加密方案的解密方法，是从小程序提供的demo中修改过来的
   * */
  wxBizDataCrypt (sessionKey, encryptedData, iv) {
    // base64 decode
    iv = Buffer.from(iv, 'base64')

    try {
      // 解密
      const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(sessionKey, 'base64'), iv)
      // 设置自动 padding 为 true，删除填充补位
      decipher.setAutoPadding(true)
      let decoded = decipher.update(Buffer.from(encryptedData, 'base64'), 'binary', 'utf8')
      decoded += decipher.final('utf8')

      decoded = JSON.parse(decoded)
      if (!decoded) {
        console.error('微信wxBizDataCrypt解密成功，但无数据', sessionKey, encryptedData, iv)
      }

      return decoded
    } catch (err) {
      console.error('微信wxBizDataCrypt解密出错', { errMsg: err.message, errStack: err.stack, data: { sessionKey, encryptedData, iv } })
      return false
    }
  },

  /**
   * 采用微信支付的签名方案
   * https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=4_3
   * */
  sign (obj, key = '') {
    const strs = []
    for (const k of Object.keys(obj).sort()) {
      if (obj[k] && obj[k] !== '0') { // 值为0或空串或字符串0或null、undefined、false都不参与签名
        strs.push(`${k}=${obj[k]}`)
      }
    }
    strs.push(`key=${key}`)
    return this.md5(strs.join('&')).toUpperCase()
  },

  /**
   * 采用微信支付的签名方案，但空值也参与签名
   * https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=4_3
   * */
  sign2 (obj, key = '') {
    const strs = Object.keys(obj).sort().map(k => `${k}=${obj[k]}`)
    return this.md5(strs.join('&') + `key=${key}`).toUpperCase()
  }
}
