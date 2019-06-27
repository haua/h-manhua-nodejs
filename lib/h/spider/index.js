// 黄浩华封装的爬虫

const logger = new (require('../../log'))('网页分析爬虫')
// 通用工具
const requestPro = require('request-promise-native')
const tencentCloud = require('../../upload_cloud/tencent')

// 爬下来的html、图片等资源放置在哪个路径下
const pathOnCloud = require('../../../config').articlesPathOnCloud || 'articles'

// 与本爬虫耦合的工具
const utils = require('./utils')
const HtmlParser = require('./html_parser')

module.exports = {
  /**
   * 判断是否可以爬取，如果传数组，其中一个地址不能爬的会返回false
   * */
  canParse (urls) {
    if (!(urls instanceof Array)) {
      urls = [urls]
    }

    return !urls.some(url => {
      let [, host] = url.match(/^https?:\/\/([^/]+)/i) || []
      return !HtmlParser.specialHost[host]
    })
  },

  /**
   * 下载页面到云存储，
   * @param url
   * @param sid sid是指它在云存储的名字，假设 sid='abc' ，则上传到云存储后的文件路径是 xxx.com/xxx/xxx/json/abc.json 和 xxx.com/xxx/xxx/html/abc.html
   * @param jsonData 需要一起被上传到云存储的json中的数据
   * @param needCover 需要从文章里找一张合适的图作为封面图: W：H= 126 ，83
   * */
  async downloadPage (url, sid, jsonData, needCover = false) {
    if (!url) {
      return [0, '请输入url']
    }
    let [, host] = url.match(/^https?:\/\/([^/]+)/i) || []
    let hostSetting = HtmlParser.specialHost[host]
    if (hostSetting && hostSetting.getUrl) {
      url = hostSetting.getUrl(url);
      ([, host] = url.match(/^https?:\/\/([^/]+)/i) || [])
      hostSetting = HtmlParser.specialHost[host]
    }
    const uaKey = (hostSetting && hostSetting.ua) || 'iphoneX'
    const { headers, body } = await this.getDataLikeChrome(url, utils.uas[uaKey])
    // 'text/html; charset=UTF-8'
    if (!/^text\/html/i.test(headers['content-type'])) {
      return [0, '指定的页面不是html格式']
    }

    if (!body) {
      return [0, '页面内容为空']
    }

    logger.log(`html已爬取: ${url}`)

    // 解析里面有哪些资源需要下载的
    const htmlPar = new HtmlParser(body, url)
    await htmlPar.init({
      needCover
    })

    const $ = htmlPar.getQueryObj()
    const $body = $('body')
    const cssUrl = htmlPar.getCssUrl()

    const htmlPrev = ($body.text() || '').replace(/[\n\s]+/g, '').substr(0, 50)
    // 保存html、title等信息到云，是以json形式保存的
    let json = {
      title: htmlPar.title,
      cssUrl: cssUrl,
      body: $body.html(),
      bodyPrev: htmlPrev
    }
    if (needCover) {
      json.cover = htmlPar.cover || ''
    }
    json.sid = sid
    json.sourceName = '转载'

    if (typeof jsonData === 'function') {
      json = await jsonData(json, htmlPar)
    } else {
      json = {
        ...json,
        ...(jsonData || {})
      }
    }

    const jsonRes = await tencentCloud.uploadStream(Buffer.from(JSON.stringify(json)), `${pathOnCloud}/json/${sid}.json`)

    // 存一份html的
    let htmlRes
    try {
      $('head').append(`<link rel="stylesheet" type="text/css" href="${cssUrl}">`)
      htmlRes = await tencentCloud.uploadStream(Buffer.from(htmlPar.getHtml()), `${pathOnCloud}/html/${sid}.html`)
      if (!htmlRes || !htmlRes.url) { console.error('html上传失败：', htmlRes) }
    } catch (e) {
      console.error('html上传出错：', e.stack)
    }

    if (jsonRes && jsonRes.url) {
      console.log('上传结果', jsonRes.url)
      return [200, '', {
        title: htmlPar.getTitle(),
        queryObj: $,
        path: '',
        json: jsonRes.url,
        cover: htmlPar.cover || '',
        html: (htmlRes && htmlRes.url) || '',
        htmlPrev: htmlPrev,
        author: htmlPar.author,
        nickname: htmlPar.nickname,
        cssUrl: cssUrl
      }]
    } else {
      console.error('上传失败：', jsonRes)
      return [0, '']
    }
  },

  /**
   * 模拟浏览器把数据加载回来，加载回的数据不会处理。
   * */
  async getDataLikeChrome (url, ua, qs, cookies) {
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
  },

  /**
   * 此接口旧了，下面有新的
   * 输入一个关键词，搜索微信公众号
   * ps. 搜索结果可能不全，前端可以建议用户尽量输公众号的全名
   *
   * 原理是爬 www.gsdata.cn 的搜索页，再分析结果
   * 如果有机会，还是换成他们的接口吧，我写这个方法的时候，申请不了他们的api key，迫不得已。
   * */
  async searchWXaccount_old (keyWord) {
    const url = `http://www.gsdata.cn/query/wx?q=${encodeURIComponent(keyWord)}`
    const { body } = await this.getDataLikeChrome(url)
    const cheerio = require('cheerio')
    const $ = cheerio.load(body)
    const $lis = $('.imgword-list .list_query')
    const datas = []
    $lis.each((i, li) => {
      const data = {}
      const $t = $(li)

      const $nickname = $t.find('#nickname')

      const headimgStr = $t.find('.img').attr('style')
      const [, headimg] = (headimgStr && headimgStr.match(/url\("?'?(.*)"?'?\)/)) || []

      const [, wxname] = $nickname.attr('href').match(/wxname=([^?&]*)/) || []

      data.wxname = wxname || ''
      data.headimg = headimg || ''
      data.nickname = $nickname.text() || ''
      data.wechat = $t.find('.wxname').text() || ''
      data.introduction = $t.find('.word-bd .pro .p-label').eq(0).text() || ''

      datas.push(data)
    })
    return datas
  },

  /**
   * 输入一个关键词，搜索微信公众号
   *
   * 原理： 微信公众平台创建文章时可以插入其它任意公众号的文章，所以，微信等于开放了一个接口...
   *
   * */
  async searchWXaccount () {
    // https://mp.weixin.qq.com/cgi-bin/searchbiz?action=search_biz&token=492086362&lang=zh_CN&f=json&ajax=1&random=0.6949351847385759&query=%E4%B8%80%E6%9D%A1&begin=0&count=5
  },

  /**
   * 获取公众号下的文章列表，原理上面的接口已经解释了
   * */
  async getArticle () {
    // ?token=492086362&lang=zh_CN&f=json&ajax=1&random=0.4495888191445305&action=list_ex&begin=0&count=5&query=&fakeid=MjM5MDI5OTkyOA%3D%3D&type=9
    // slave_sid=dVNVa0VRTUNqN2NHVW1pSWJqaV9USmNEcjNMQXFjYjA0ZjVXajVOaVhwOVA1a0VVcUNiTWtjS0VUa0QyQUZtNl92d0x6OWR6RzB2OFRyNFVsMzZ6VjhjZ0I4QmRON0FmUFJyOTlocElxVDhmUnBtTENlY1B5bEdVOTFpWlQ1dnJnV3VuemtsMEpSd0dpV0d4; Path=/; Secure; HttpOnly
    // slave_sid=dVNVa0VRTUNqN2NHVW1pSWJqaV9USmNEcjNMQXFjYjA0ZjVXajVOaVhwOVA1a0VVcUNiTWtjS0VUa0QyQUZtNl92d0x6OWR6RzB2OFRyNFVsMzZ6VjhjZ0I4QmRON0FmUFJyOTlocElxVDhmUnBtTENlY1B5bEdVOTFpWlQ1dnJnV3VuemtsMEpSd0dpV0d4; Path=/; Secure; HttpOnly

    // noticeLoginFlag=1; pt2gguin=o0294886728; RK=6aLMQ/XwRb; ptcz=f4833951e029e906f74fadc30210c699e441a59d36dc9e31cb05aed148d90d83; pgv_pvi=6341010432; pgv_pvid=4911235380; ua_id=DZjFGEbBIvF3DyZVAAAAALJQgzfRFp2UaIY0uKWhLAo=; mm_lang=zh_CN; noticeLoginFlag=1; pgv_si=s7381284864; ptisp=ctc; ptui_loginuin=294886728@qq.com; uin=o0294886728; skey=@QBln7RZAs; rewardsn=; wxtokenkey=777; cert=858jG8F2gu5XsDsrD4v5zuhNIzHBB0y3; pgv_info=ssid=s9298792; uuid=07e24d5c75a10464fc8f114272b4d66f; ticket=f908f1f7e14d83bed072a688bfaab1988d9f0cdc; ticket_id=gh_a7da96892b53; data_bizuin=3082438931; bizuin=3092440729; data_ticket=x7buNlXdbZdFuK/LvORtz/Mec+BNtBadG7OBuT19NDl2f9fzdApws1viwGqfN9Og; slave_sid=dVNVa0VRTUNqN2NHVW1pSWJqaV9USmNEcjNMQXFjYjA0ZjVXajVOaVhwOVA1a0VVcUNiTWtjS0VUa0QyQUZtNl92d0x6OWR6RzB2OFRyNFVsMzZ6VjhjZ0I4QmRON0FmUFJyOTlocElxVDhmUnBtTENlY1B5bEdVOTFpWlQ1dnJnV3VuemtsMEpSd0dpV0d4; slave_user=gh_a7da96892b53; xid=dc2dad1db8e7fd6d61c665f9883f7f04

    // 会变的内容只有 token
    const qs = {
      token: '492086362',
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      random: Math.random(),
      action: 'list_ex',
      begin: '0',
      count: '5',
      query: '',
      fakeid: 'MjM5MDI5OTkyOA%3D%3D', // 公众号唯一识别
      type: '9'
    }
    const url = `https://mp.weixin.qq.com/cgi-bin/appmsg`

    const cookies = {
      slave_sid: 'dVNVa0VRTUNqN2NHVW1pSWJqaV9USmNEcjNMQXFjYjA0ZjVXajVOaVhwOVA1a0VVcUNiTWtjS0VUa0QyQUZtNl92d0x6OWR6RzB2OFRyNFVsMzZ6VjhjZ0I4QmRON0FmUFJyOTlocElxVDhmUnBtTENlY1B5bEdVOTFpWlQ1dnJnV3VuemtsMEpSd0dpV0d4',
      slave_user: 'gh_a7da96892b53',
      bizuin: '3092440729',
      data_bizuin: '3082438931',
      data_ticket: 'x7buNlXdbZdFuK/LvORtz/Mec+BNtBadG7OBuT19NDl2f9fzdApws1viwGqfN9Og'
    }

    const { headers, body } = await this.getDataLikeChrome(url, '', qs, cookies)
    const needSetCookie = headers['set-cookie']
    return { needSetCookie, body: JSON.parse(body) }
  },

  async test () {
    const url = 'https://mp.weixin.qq.com/'
    const cookies = {
      slave_sid: 'dVNVa0VRTUNqN2NHVW1pSWJqaV9USmNEcjNMQXFjYjA0ZjVXajVOaVhwOVA1a0VVcUNiTWtjS0VUa0QyQUZtNl92d0x6OWR6RzB2OFRyNFVsMzZ6VjhjZ0I4QmRON0FmUFJyOTlocElxVDhmUnBtTENlY1B5bEdVOTFpWlQ1dnJnV3VuemtsMEpSd0dpV0d4',
      slave_user: 'gh_a7da96892b53',
      bizuin: '3092440729',
      data_bizuin: '3082438931',
      data_ticket: 'x7buNlXdbZdFuK/LvORtz/Mec+BNtBadG7OBuT19NDl2f9fzdApws1viwGqfN9Og'
    }

    const { headers, body } = await this.getDataLikeChrome(url, '', '', cookies)
    const needSetCookie = headers['set-cookie']
    return { needSetCookie, body: body }
  }
}
