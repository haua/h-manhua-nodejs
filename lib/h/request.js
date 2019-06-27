/**
 * 封装一下request方法
 *
 * ps1. 用这里的方法，永远返回完整的 request 对象，需要获取对象里的 body 属性，才是http返回的body
 * ps2. 用这里的方法，报错了也不会抛出错误，而是依然会返回 request 本来的对象
 * ps3. 如果想知道发生了什么错误，只要根据返回的对象的 hCode 属性，与本module输出的 hCode 一一对应就知道发生了什么类型的网络错误
 *
 * 返回的对象中，
 * */
const requestPro = require('request-promise-native')

/**
 * 用于给外部对比当前发生了什么错误
 *
 * 用法：
 *
 * const res = await hReq.post('http://xxx.cn')
 * if(res.hCode === hReq.hCode.success){
 *   // 请求成功
 * }
 * */
const hCode = {
  success: Symbol('请求成功'),
  timeout: Symbol('请求超时'),
  refused: Symbol('对方拒绝链接')
}

const errorCodes = {
  'ESOCKETTIMEDOUT': hCode.timeout,
  'ECONNREFUSED': hCode.refused
}

// post数据发送类型
const postTypes = {
  formData: Symbol('form-data'),
  xWwwFormUrlencoded: Symbol('x-www-form-urlencoded'),
  raw: Symbol('raw'),
  binary: Symbol('binary')
}

module.exports = {
  hCode: hCode,

  /**
   * get
   * @param url
   * @param qs
   * @param type 返回的数据类型，默认是json
   * */
  async get (url, qs, { type = 'json', timeout, ua, referer, cookie, ...reqOpt } = {}) {
    const param = {
      method: 'GET',
      uri: url,
      qs: qs,
      timeout: timeout,
      ...reqOpt
    }
    if (type === 'json') {
      param.json = true // 如果解析失败，它会自动返回字符串
    }
    return this.requestBase(param, ua, referer, cookie)
  },

  // post数据发送类型
  postTypes: postTypes,

  /**
   * @param url
   * @param data
   * @param postType string|int 发送数据的格式：查看postTypes
   * @param type 接收数据的类型
   * @param contentType 发送数据的类型: text/xml  application/json
   * @param ua
   * @param referer 这个可以传调用此接口的页面，有的接口有防盗链，就靠这个破解
   * @param cookie 有的接口还要登录后才能用，所以还需要这个
   * @param timeout 超时时间，单位毫秒
   * */
  async post (url, data, {
    type = 'json',
    // contentType = 'json',
    postType = postTypes.raw,
    timeout,
    ua,
    referer,
    cookie,
    contentType,
    ...reqOpt
  } = {}) {
    const param = {
      method: 'POST',
      uri: url,
      timeout: timeout,
      ...reqOpt
    }

    if (data) {
      switch (postType) {
        case postTypes.xWwwFormUrlencoded:
          param.form = data
          break
        case postTypes.formData:
          param.formData = data
          break
        case postTypes.raw:
          param.body = data
          break
        default:
          param.body = data
      }
    }

    if (contentType) {
      param.headers = param.headers || {}
      param.headers['Content-Type'] = contentType
      switch (contentType) {
        case 'application/json':
          if (param.body) { param.body = param.body && typeof param.body === 'string' ? param.body : JSON.stringify(param.body) }
          break
      }
    } else if (type === 'json') {
      param.json = true // 如果解析失败，它会自动返回字符串
    }

    return this.requestBase(param, ua, referer, cookie)
  },

  /**
   * 再封装一层，主要是有些参数的转换
   * @param option 官方request的参数，如果只传这个参数，可以直接用原生的
   * @param ua
   * @param referer 这个可以传调用此接口的页面，有的接口有防盗链，就靠这个破解
   * @param cookie 有的接口还要登录后才能用，所以还需要这个
   * @return object
   * @return object.statusCode
   * @return object.body
   * @return object.headers
   * @return object.request
   * */
  async requestBase (option, ua, referer, cookie) {
    if (!option.headers) {
      option.headers = {}
    }

    if (option.timeout === null || option.timeout === undefined) {
      option.timeout = 5000
    }

    if (ua) {
      option.headers['User-Agent'] = ua
    }

    if (referer) {
      const [origin, host] = referer.match(/^https?:\/\/([^/]+)/i) || [] // match 里第二个才是括号里匹配到的
      option.headers = {
        ...option.headers,
        Host: host,
        Origin: origin,
        Referer: referer
      }
    }

    // 把这个值默认设为true
    if (option.resolveWithFullResponse !== false) {
      option.resolveWithFullResponse = true
    }

    if (cookie) {
      // 转换obj类型的Cookie
      if (typeof cookie === 'object') {
        const cookiesArr = []
        for (const [k, v] of Object.entries(cookie)) {
          cookiesArr.push(`${k}=${v}`)
        }
        cookie = cookiesArr.join('; ')
      }
      option.headers.Cookie = cookie
    }

    try {
      const res = await requestPro(option)
      res.hCode = hCode.success
      return res
    } catch (e) {
      // name: 'RequestError',
      //   message: 'Error: getaddrinfo ENOTFOUND localhost2 localhost2:80',
      //   cause:
      // { Error: getaddrinfo ENOTFOUND localhost2 localhost2:80
      //   at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:57:26)
      //   errno: 'ENOTFOUND',
      //     code: 'ENOTFOUND',
      //   syscall: 'getaddrinfo',
      //   hostname: 'localhost2',
      //   host: 'localhost2',
      //   port: 80 },
      // error:
      // { Error: getaddrinfo ENOTFOUND localhost2 localhost2:80
      //   at GetAddrInfoReqWrap.onlookup [as oncomplete] (dns.js:57:26)
      //   errno: 'ENOTFOUND',
      //     code: 'ENOTFOUND',
      //   syscall: 'getaddrinfo',
      //   hostname: 'localhost2',
      //   host: 'localhost2',
      //   port: 80 },
      // options:
      // { method: 'GET',
      //   uri: 'http://localhost2/',
      //   qs: '',
      //   headers:
      //   { Host: 'localhost2',
      //     Origin: 'http://localhost2',
      //     Referer: 'http://localhost2/',
      //     Accept: 'application/json, text/javascript, */*; q=0.01',
      //     Connection: 'keep-alive',
      //     'User-Agent':
      //     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36',
      //       Cookie: '' },
      //   resolveWithFullResponse: true,
      //     callback: [Function: RP$callback],
      //   transform: undefined,
      //     simple: true,
      //   transform2xxOnly: false },
      // response: undefined }
      const { error } = e
      return {
        hCode: errorCodes[error.code] || 0,
        error: e
      }
    }
  }
}
