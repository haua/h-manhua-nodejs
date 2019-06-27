const assert = require('assert')
const HtmlParser = require('./html_parser')
const requestPro = require('request-promise-native')

/**
 * 模拟浏览器把数据加载回来，加载回的数据不会处理。
 * */
const getDataLikeChrome = async function (url, ua, qs, cookies) {
  if (cookies) {
    const cookiesArr = []
    for (const [k, v] of Object.entries(cookies)) {
      cookiesArr.push(`${k}=${v}`)
    }
    cookies = cookiesArr.join('; ')
  }
  const { headers, body } = await requestPro({
    method: 'GET',
    uri: url,
    headers: { // 指定请求头
      'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
      'Connection': 'keep-alive',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.8', // 指定 Accept-Language
      'Cookie': cookies || '' // 指定 Cookie
    },
    qs: qs || {},
    resolveWithFullResponse: true // 默认只返回body内容，把这个设为true，就会返回所有内容
  })

  return { headers, body }
}

describe('网页解析', () => {
  it('解析含background图片的', async function () {
    const url = 'https://mp.weixin.qq.com/s?__biz=MzU2MTg5MTYzMg==&mid=2247483667&idx=1&sn=871bd82d41d0533ba1b2551ddfded4b7'
    const { body } = await getDataLikeChrome(url, 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1')
    const htmlPar = new HtmlParser(body, url)
    await htmlPar.init()

    const $ = htmlPar.getQueryObj()
    const $body = $('body')

    console.log('body\n', $body.html())

    assert.strictEqual(!!htmlPar.title, true)
  })
})
