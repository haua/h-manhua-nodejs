// 专供 spider 使用的小工具
const request = require('request')
const hfs = require('../fs')
const fs = require('fs')
const path = require('path')

const tencentCloud = require('../../upload_cloud/tencent')

const uas = {
  // iphoneX
  iphoneX: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',

  // chrome
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
}
const contentTypeMap = {
  'image/tiff': 'tif',
  'image/gif': 'gif',
  'image/x-icon': 'ico',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/vnd.wap.wbmp': 'wbmp'
}

module.exports = {
  uas,

  /**
   * 把一个文件下载回来
   *
   * @param url string 要下载的文件地址
   * @param origin string 请求这个文件的域名，要带上 http 头
   * @param referer string 请求这个文件的url，如果没有，则传 url 一样的即可
   * @param fileName sring 要把文件存储到，这里要包含文件名，但不要包含扩展名，这里面会自动加上扩展名的
   * @param uaKey string 用哪个ua来下载，默认是iPhoneX的
   * @param cookies obj
   * @return string | boolean 成功则会返回文件路径，失败则返回false
   * */
  async downloadOneFile (url, origin, referer, fileName, uaKey, cookies) {
    // 把文件目录创建好
    const dir = path.dirname(fileName)
    if (!hfs.mkdir(dir)) {
      return false
    }

    // 如果 url 是 // 开头，会报错，而html里是允许用 // 开头的
    if (url.indexOf('//') === 0) {
      const [http] = referer.match(/^https?:/) || []
      url = http + url
    }

    // 在下载路径中找找有没有文件扩展名
    let [, ext = ''] = url.match(/\.([a-zA-Z0-9]+)(\?.*)?(#.*)?$/) || []
    // let fileName = path.join(downloadDir, `test${ext ? ('.' + ext) : ''}`)

    const res = await this.downloadFileByStream(url, referer, fileName + (ext ? `.${ext}` : ''), uaKey, cookies)

    if (!res) {
      console.log('下载失败：', url)
      return false
    }

    // 重命名它的类型，这里是已经把文件下载回来，知道返回头之后才能进行的
    if (!ext) {
      const contentType = res.response.headers['content-type']
      ext = contentTypeMap[contentType] || ''
      if (!ext) {
        console.log('找不到扩展名：', contentType)
      } else {
        ext = '.' + ext

        if (!await hfs.rename(fileName, fileName + ext)) {
          console.log('改名失败：', fileName)
        } else { fileName = fileName + ext }
      }
    }

    return fileName
  },

  /**
   * 用管道下载文件，减少内存占用
   * 因为 request-promise 没法用数据流下载数据，要用回调方式
   * https://github.com/request/request-promise#api-in-detail
   * @param url string 要下载的文件地址
   * @param referer string 请求这个文件的url，如果没有，则传 url 一样的即可
   * @param dir sring 要把文件存储到，这里就要包含文件名了
   * */
  downloadFileByStream (url, referer, dir, uaKey, cookies) {
    if (cookies) {
      const cookiesArr = []
      for (const [k, v] of Object.entries(cookies)) {
        cookiesArr.push(`${k}=${v}`)
      }
      cookies = cookiesArr.join('; ')
    }
    let [origin] = referer.match(/^https?:\/\/([^/]+)/i) || [] // match 里第二个才是括号里匹配到的
    return new Promise(function (resolve, reject) {
      request({
        method: 'GET',
        uri: url,
        headers: { // 指定请求头
          // Host: host, // 爬图片似乎不能有这个
          Origin: origin,
          Referer: referer,
          'User-Agent': uas[uaKey] || uas['iphoneX'],
          // 'Connection': 'keep-alive',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.8', // 指定 Accept-Language
          'Cookie': cookies || '' // 指定 Cookie
        }
      })
        .on('response', function (response) {
          if (response.statusCode >= 400) {
            resolve(false)
          } else {
            resolve({ response })
          }
        })
        // 用stream流保存文件，比把整个文件下载回来再保存，占用的内存可能要小一些
        .pipe(fs.createWriteStream(dir))
    })
  },

  /**
   * 下载一个文件到云，不直接存到我们本地了
   *
   * @param url string 要下载的文件地址
   * @param referer string 请求这个文件的url，如果没有，则不用传
   * @param fileName string 要把文件存储到，这里要包含文件名，但不要包含扩展名，这里面会自动加上扩展名的
   * @param uaKey string 用哪个ua来下载，默认是iPhoneX的
   * @param cookies obj
   * @return string | boolean 成功则会返回文件在云上的完整url，失败则返回false
   * */
  async downloadFileToCloud (url, referer, fileName, uaKey, cookies) {
    // 如果 url 是 // 开头，会报错，而html里是允许用 // 开头的
    if (url.indexOf('//') === 0) {
      if (referer) {
        const [http] = referer.match(/^https?:/) || []
        url = http + url
      } else {
        url = 'https:' + url
      }
    }

    if (!/^https?:\/\/.+/.test(url)) {
      console.error(`“${url}” 不是一个链接`)
      return false
    }

    // 在下载路径中找找有没有文件扩展名
    let [, ext = ''] = url.match(/\.([a-zA-Z0-9]+)(\?.*)?(#.*)?$/) || []
    // let fileName = path.join(downloadDir, `test${ext ? ('.' + ext) : ''}`)

    /**
     * 以前是直接用管道上传到云的，但是现在发现在有时候上传会失败，可能是运维改了配置
     * */
    // const cacheName = ''

    const res = await tencentCloud.uploadStream(
      this.getReadStreamOfUrl(url, referer || url, uaKey, cookies),
      fileName + (ext ? `.${ext}` : '')
    )

    if (!res || !res.url) {
      console.error('上传失败：', url)
      return false
    }

    // 重命名它的类型，这里是已经把文件下载回来，知道返回头之后才能进行的
    if (!ext) {
      // const contentType = res.response.headers['content-type']
      // ext = contentTypeMap[contentType] || ''
      // if (!ext) {
      //   console.log('找不到扩展名：', contentType)
      // } else {
      //   ext = '.' + ext
      //
      //   if (!await hfs.rename(fileName, fileName + ext)) {
      //     console.log('改名失败：', fileName)
      //   } else { fileName = fileName + ext }
      // }
    }

    return res.url
  },

  /**
   * 有时文件并不想下载回本地，而是想直接上传，那就可以用这个方法，拿到的 request 对象其实也是一个 readStream，是可以用于云存储上传的
   * */
  getReadStreamOfUrl (url, referer, uaKey, cookies) {
    if (cookies) {
      const cookiesArr = []
      for (const [k, v] of Object.entries(cookies)) {
        cookiesArr.push(`${k}=${v}`)
      }
      cookies = cookiesArr.join('; ')
    }
    let [origin] = (referer || '').match(/^https?:\/\/([^/]+)/i) || [] // match 里第二个才是括号里匹配到的
    return request({
      method: 'GET',
      uri: url,
      headers: { // 指定请求头
        // Host: host, // 爬图片似乎不能有这个
        Origin: origin,
        Referer: referer,
        'User-Agent': uas[uaKey] || uas['iphoneX'],
        // 'Connection': 'keep-alive',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8', // 指定 Accept-Language
        'Cookie': cookies || '' // 指定 Cookie
      }
    })
  }
}
