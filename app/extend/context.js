module.exports = {
  // this 就是 ctx 对象，在其中可以调用 ctx 上的其他方法，或访问属性
  jsonBody (errCode, errMsg, data) {
    this.type = 'json'

    if (!errMsg && !data) {
      if (errCode instanceof Array) {
        ([errCode, errMsg, data] = errCode)
      } else if (errCode && Object === errCode.constructor) {
        ({ data, msg: errMsg, code: errCode } = errCode)
      }
    }

    if (!errCode && errCode !== 0) {
      errCode = 500
      errMsg = errMsg || '未配置errCode'
    } else {
      const olderrCode = errCode
      errCode = parseInt(errCode)
      if (isNaN(errCode)) {
        console.log('【errCode配置不正确】', olderrCode)
        errCode = 500
        errMsg = errMsg || 'errCode配置不正确'
      }
    }

    try {
      this.body = JSON.stringify({
        data: data || {},
        code: errCode,
        msg: errMsg,
        t: Date.now()
      })

      return this.body
    } catch (e) {
      console.error(this.request.url, { code: 500, msg: '输出的数据无法解析' }, this.method.toLowerCase(), data)
      return this.jsonBody(500, '输出的数据无法解析')
    }
  },

  ok (data) {
    return this.jsonBody(200, 'ok', data)
  }
}
