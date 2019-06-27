/**
 * 微信公众号搜索
 * 查询公众号的文章
 *
 * 因为用系统的定时任务，没办法动态控制下一次是什么时候再爬，所以在这里写了
 * */

const logger = new (require('../../log'))('扫描公众号')

const path = require('path')
const meeko = require('meeko')
const hReq = require('../request')
const utils = require('./utils')
const hCrypto = require('../crypto')
const hRedis = require('../redis').default()

const hSpider = require('./index')
const hTools = require('../tools')
const articleModel = require('../../../service/article')

let spideWaitTime = 30 * 1000 // 爬文章列表的接口等待多久
const spideWaitTimeCache = spideWaitTime

const loginInfo = {}

const { staticDir = 'www', upload_path: uploadPath = 'uploadfiles' } = require('../../../config')
const cacheloadDir = `./${staticDir}/${uploadPath}/cache/` // 下载文件夹

const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36'

async function getWxCookie () {
  return await hRedis.cache('wxLoginCookies') || {}
}

// 登录时，需要save一下cookie哦
async function saveWxCookie (cookie) {
  if (cookie && cookie.forEach) {
    const wxLoginCookies = await getWxCookie()
    // [
    //   "bizuin=3082438931; Path=/; Secure; HttpOnly",
    //   "data_bizuin=EXPIRED; Path=/; Expires=Wed, 07-Nov-2018 16:01:18 GMT; Secure; HttpOnly",
    //   "login_certificate=LDbTTN+b0DYLtL4yB2So19iV/w4aA+CXTjNg8SGnTTs=; Path=/; Secure; HttpOnly",
    // ]
    cookie.forEach((item) => {
      const [mainStr] = item.match(/^[^;]+/) || []
      if (!mainStr) {
        return
      }
      const [, key, val] = mainStr.match(/([^=]*)=(.*)/) || []
      if (!key) {
        return
      }
      if (val === 'EXPIRED') {
        delete wxLoginCookies[key]
      } else {
        wxLoginCookies[key] = val
      }
    })

    return hRedis.cache('wxLoginCookies', wxLoginCookies, 2 * 60 * 60)
  }
  return false
}

let wxAccountCSRFtoken = ''
let wxAccountCSRFtokenTimeout = 0

// 这个token是微信的csrf验证码
async function saveWxToken (token) {
  wxAccountCSRFtoken = token
  wxAccountCSRFtokenTimeout = Date.now() + 2 * 60 * 60
  return hRedis.cache('wxAccountCSRFtoken', token, 2 * 60 * 60)
}

async function getWxToken () {
  const now = Date.now()
  if (wxAccountCSRFtoken && wxAccountCSRFtokenTimeout > now) {
    return wxAccountCSRFtoken
  }
  wxAccountCSRFtoken = await hRedis.cache('wxAccountCSRFtoken')
  if (wxAccountCSRFtoken) {
    wxAccountCSRFtokenTimeout = now + await hRedis.ttl('wxAccountCSRFtoken')
  }
  return wxAccountCSRFtoken
}

// 把搜索到的公众号存在这
let wxAccount = {}

// 缓存微信公众号
// {
//   "fakeid": "MjM5MDI5OTkyOA==",
//   "nickname": "一条",
//   "alias": "yitiaotv",
//   "round_head_img": "http://mmbiz.qpic.cn/mmbiz_png/OsOjJJlzzCNXT2YygYp0Q28bf6XQX8NCjd9DaibJBxX4SCicibx6eQnqY8X2Lk6aVoNw4AzFIYvhcyFkgDtic61dug/0?wx_fmt=png",
//   "service_type": 1
// }
async function saveWXaccount (list) {
  list.some((item) => {
    wxAccount[item['fakeid']] = item
  })

  return hRedis.cache('wxAccounts', wxAccount, 2 * 60 * 60)
}

function trim (text) {
  return text.replace(/^[\s\n]+|\s\n+$/g, '')
}

async function getWXaccount (fakeid) {
  if (Object.keys(wxAccount).length <= 0) {
    wxAccount = await hRedis.cache('wxAccounts') || {}
  }
  return wxAccount[fakeid]
}

let myOrigin = '' // 本服务当前的域名，保存图片时，把图片完整路径写入数据库，这个不以斜杠结尾
let spiding = false // 是否正在爬取
let lastAccountNum = 0 // 上一次循环时共有多少个公众号，如果没有增加，就不再爬了，容易被微信ban

module.exports = {
  // 设置ctx，有可能这里内部需要知道本服务所在的域名，用于保存图片时知道怎么写完整图片链接
  setCtx (ctx) {
    myOrigin = ctx.origin || ''
  },

  // 检查是否需要登录，即微信后台的session是否还在
  async ifNeedLogin () {
    return !(await getWxToken() && await getWxCookie())
  },

  /**
   * 从微信登录
   * 成功返回的data示例，这是接下来要扫描的二维码
   * {
   *   "qrcode": "www%uploadfiles\\cache\\2018110901290355368"
   * }
   * */
  async login (account, pwd, imageCode) {
    loginInfo.account = account
    loginInfo.pwd = pwd
    const url = 'https://mp.weixin.qq.com/cgi-bin/bizlogin?action=startlogin'
    const data = {
      username: account,
      pwd: hCrypto.md5(pwd),
      imgcode: imageCode || '',
      f: 'json',
      userlang: 'zh_CN',
      token: '',
      lang: 'zh_CN',
      ajax: 1
    }
    const { headers, body } = await hReq.post(url, data, {
      postType: hReq.postTypes.xWwwFormUrlencoded,
      type: 'json',
      ua: ua,
      referer: 'https://mp.weixin.qq.com/'
    })
    if (headers['set-cookie']) {
      // 登录时，可能需要加这些cookie
      headers['set-cookie'].push('mm_lang=zh_CN;')
      headers['set-cookie'].push('noticeLoginFlag=1;')
    }
    const ret = body && body.base_resp && parseInt(body.base_resp.ret)
    if (ret !== 0) {
      if (ret === 200008) {
        await saveWxCookie(headers['set-cookie'])
        return [200008, '需要图片验证码']
      }
      return [0, '登录失败，可能是账号密码不正确', body]
    }

    if (await saveWxCookie(headers['set-cookie'])) {
      return [200, '', {
        qrcode: 'parse/wxLogin/qrcode'
      }]
    }

    return [0, '登录失败，没有微信cookie返回，可能微信发现我们在刷接口了']
  },

  // 上面登录成功后，就可以使用这个接口获取登录二维码了
  async getLoginQrCode (account) {
    let cookies = await getWxCookie()
    const rand = parseInt(Math.random() * 900 + 100)
    const url = 'https://mp.weixin.qq.com/cgi-bin/loginqrcode?action=getqrcode&param=4300&rd=' + rand

    let [origin] = url.match(/^https?:\/\/([^/]+)/i) || [] // match 里第二个才是括号里匹配到的

    if (cookies) {
      const cookiesArr = []
      for (const [k, v] of Object.entries(cookies)) {
        cookiesArr.push(`${k}=${v}`)
      }
      cookies = cookiesArr.join('; ')
    }

    const req = require('request')

    return req({
      method: 'GET',
      encoding: null,
      uri: url,
      headers: { // 指定请求头
        // Host: host, // 爬图片似乎不能有这个
        Origin: origin,
        Referer: `https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=${account}`,
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8', // 指定 Accept-Language
        'Cookie': cookies || '' // 指定 Cookie
      }
    })
  },

  /**
   * 登录时，有可能需要显示图形码
   * */
  async getLoginImgcode (account) {
    let cookies = await getWxCookie()
    const rand = parseInt(Math.random() * 9999999999999).toString().padStart(13, '0')
    const url = `https://mp.weixin.qq.com/cgi-bin/verifycode?username=${account}&r=1557114598375&rd=${rand}`

    const [origin] = url.match(/^https?:\/\/([^/]+)/i) || [] // match 里第二个才是括号里匹配到的

    if (cookies) {
      const cookiesArr = []
      for (const [k, v] of Object.entries(cookies)) {
        cookiesArr.push(`${k}=${v}`)
      }
      cookies = cookiesArr.join('; ')
    }

    const req = require('request')

    return req({
      method: 'GET',
      encoding: null,
      uri: url,
      headers: { // 指定请求头
        Origin: origin,
        Referer: `https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=${account}`,
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8', // 指定 Accept-Language
        'Cookie': cookies || '' // 指定 Cookie
      }
    })
  },

  // 上面登录成功后，就可以使用这个接口获取登录二维码了
  async downloadLoginQrCode () {
    const wxLoginCookies = await getWxCookie()
    const rand = parseInt(Math.random() * 900 + 100)
    const url = 'https://mp.weixin.qq.com/cgi-bin/loginqrcode?action=getqrcode&param=4300&rd=' + rand

    let [origin] = url.match(/^https?:\/\/([^/]+)/i) || [] // match 里第二个才是括号里匹配到的

    return utils.downloadOneFile(
      url, origin,
      `https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=${loginInfo.account}`,
      path.join(cacheloadDir, meeko.now().format('YYYYMMDDHHmmss') + parseInt(Math.random() * 99999)),
      'chrome', wxLoginCookies
    )
  },

  /**
   * 检查用户是否扫码了以上二维码
   * */
  async checkIfScan (account) {
    const wxLoginCookies = await getWxCookie()

    const url = 'https://mp.weixin.qq.com/cgi-bin/loginqrcode?action=ask&token=&lang=zh_CN&f=json&ajax=1'

    // pgv_pvi pgv_si 这两个没有的可能很重要
    // pgv_pvi=107128832; pgv_pvid=9043155036; ua_id=bztVheFEszzQOm0xAAAAAHSdWtLS0-WppoGNLPwOFms=; mm_lang=zh_CN; noticeLoginFlag=1; xid=cf23c18356a57bab16773b4b46eb75de; rewardsn=; wxtokenkey=777; pgv_si=s4493078528; cert=5dE9N36QHZGP_MLYT5KxykS_cKnVqw7s; uuid=ee73ce426e5ab9105568213b0630d4ea; bizuin=3082438931; ticket=0a619eef4c483cec6170e8d4f9334c019ba2adff; ticket_id=gh_a7da96892b53; ticket_uin=3082438931; login_certificate=dh+b+9BrEQOxmhf90czUdMg3jN2oBQHYltpuJq2B334=; ticket_certificate=yGnVdrfqXE6mkeeKGgK2jA5KsX+XNNQScdmSzDVwb58=; fake_id=3092440729; login_sid_ticket=2921708771e96fde7d5524d9876f65f4101583f6
    // { uuid: 'c5541f901ff5f2373069261d1c067af9',
    //   bizuin: '3082438931',
    //   ticket: '0a619eef4c483cec6170e8d4f9334c019ba2adff',
    //   ticket_id: 'gh_a7da96892b53',
    //   cert: 'U1D6waleZxHlxSfqA0GGfdA5RdMWZ36R',
    //   ticket_uin: '3082438931',
    //   login_certificate: 'Vgji8xwbz5Gx3tnCfJ3aWliVD3P5X0Lm9mJtM+TtoQk=',
    //   ticket_certificate: 'u4OONY+8MZa/Q4k9VaGI59KtOGxcsf9CSUVri0DI7VA=',
    //   fake_id: '3092440729',
    //   login_sid_ticket: '2921708771e96fde7d5524d9876f65f4101583f6',
    //   remember_acct: 'haua33%40126.com' }

    // {base_resp: {err_msg: "ok", ret: 0}
    // err_msg: "ok"
    // ret: 0
    // status: 3 // 这个为3则二维码过期，为0则未过期，为1是成功扫码了
    // user_category: 0}
    const referer = `https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=${encodeURIComponent(account)}`
    const { body } = await hReq.get(url, '', {
      type: 'json',
      ua,
      referer,
      cookie: wxLoginCookies
    })
    if (!body) {
      return [0, '微信没有任何返回值']
    }

    const ret = body.base_resp && body.base_resp.ret

    if (ret === 0 || ret === '0') {
      const status = parseInt(body.status)
      let isLogin = 0
      if (status === 1) { // 成功扫码
        isLogin = await this.loginAfterScan(account) ? 1 : 0
      }
      return [200, '', {
        status,
        isLogin
      }]
    } else if (ret === 1 || ret === '1') { // 有时候微信会返回这个
      // {"base_resp":{"err_msg":"default","ret":1}}
      logger.log(11111, wxLoginCookies)
      return [200, '', {
        status: 2,
        isLogin: 0
      }]
    } else if (ret === 200003 || ret === '200003') {
      return [0, '请重新登录']
    }
    logger.log('【微信公众号搜索】二维码登录结果查询出错：', body)
    return [0, '微信报错', body]
  },

  // 扫码成功后调用此接口获取登录信息，主要是要设置cookie
  async loginAfterScan (account) {
    const wxLoginCookies = await getWxCookie()
    const url = `https://mp.weixin.qq.com/cgi-bin/bizlogin?action=login`
    const data = {
      userlang: 'zh_CN',
      token: '',
      lang: 'zh_CN',
      f: 'json',
      ajax: 1
    }
    const referer = `https://mp.weixin.qq.com/cgi-bin/bizlogin?action=validate&lang=zh_CN&account=${account}`
    const { headers, body } = await hReq.post(url, data, {
      postType: hReq.postTypes.xWwwFormUrlencoded,
      ua,
      referer,
      cookie: wxLoginCookies
    })

    // {
    //   "base_resp": {
    //     "err_msg": "ok",
    //     "ret": 0
    //   },
    //   "redirect_url": "/cgi-bin/home?t=home/index&lang=zh_CN&token=1005948474"
    // }
    if (body && body.base_resp && parseInt(body.base_resp.ret) === 0 && body.redirect_url) {
      if (await saveWxCookie(headers['set-cookie'])) {
        const [, token] = body.redirect_url.match(/&token=([^&]+)/) || []
        if (token) {
          await saveWxToken(token)

          // 登录成功后，马上爬公众号的新文章
          this.startSpide()
          return true
        }
      }
    }
    return false
  },

  // 搜索公众号
  async searchWXaccount (keyword, page) {
    page = parseInt(page)
    if (!page || isNaN(page) || page < 1) {
      page = 1
    }
    const token = await getWxToken()
    let pageSize = 5
    const qs = {
      action: 'search_biz',
      token: token,
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      begin: (page - 1) * pageSize,
      count: pageSize,
      random: Math.random(),
      query: keyword
    }
    const wxLoginCookies = await getWxCookie()

    const referer = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&token=${token}&lang=zh_CN`
    const url = 'https://mp.weixin.qq.com/cgi-bin/searchbiz'
    const { headers, body } = await hReq.get(url, qs, { ua, referer, cookie: wxLoginCookies })
    if (!(body.list && body.list.length)) {
      if (body.base_resp && parseInt(body.base_resp.ret) === 200040) {
        return [0, '登录授权已过期，请重新登录微信公众号']
      }
      if (body.base_resp && parseInt(body.base_resp.ret) === 200013) {
        return [0, '操作太过频繁，触发微信频率限制，请1小时后再试']
      }
      logger.log('【搜索失败】：', body)
      return [0, '搜索失败，请重试，或重新登录微信公众号试试']
    }
    saveWxCookie(headers['set-cookie'])

    saveWXaccount(body.list)

    // 只要是有分页需求的，就要这个数据结构
    const data = {
      page,
      page_size: pageSize,
      more_page: body.list.length >= pageSize,
      total: body.total, // -1表示未查询总共有多少页，移动端一般不需要查
      list: body.list
    }

    return [200, '', data]
  },

  /**
   * 开始爬指定公众号的历史数据
   * 为了防止被ban，这里不会马上爬该公众号，而是把公众号放入爬取队列，每次调用以上登录接口登录成功，队列才会启动
   * */
  async startSpiderHistory (fakeid) {
    const account = await getWXaccount(fakeid)
    if (!account) {
      return [0, '公众号不存在，请先查询公众号再继续']
    }

    let accID = await articleModel.getWxAccountByFakeid(fakeid)
    if (accID) { return [200, '此公众号已在更新队列'] }

    // 把公众号存起来
    const res = await articleModel.createWxAccount(account)
    if (res[0] !== 200) {
      return res
    }
    return [200, '已成功把此公众号加入更新队列']
  },

  // 开始爬历史数据， awaitUntilFinish 等到这个公众号所有文章全部爬完再return
  async spideHistory (accID, fakeid, awaitUntilFinish) {
    // 此时如果成功，肯定会返回消息总数
    let [, total] = await this.spideOneTime(accID, fakeid, 0, 0, true) || []
    if (!total) { // 一篇文章都没有，或者获取失败没session了
      return [0, '此公众号一条群发消息都没有？']
    }

    articleModel.updateTotalMsgNum(accID, total)

    const pageNum = 5 // 每次只能爬5条消息

    // 历史已爬取的数量，因为可能本次是中断后继续的
    const hadSpideMsgNum = parseInt(await articleModel.getHadSpideNum(accID)) || 0

    let spideTime = 0 // 爬取次数，每爬成功一次+1

    const t = this

    if (awaitUntilFinish) {
      await interval()
    } else {
      interval()
    }

    return [200, '已成功启动']

    async function interval () {
      await hTools.setTimeout(hTools.rand(parseInt(spideWaitTime / 2), spideWaitTime * 2)) // 这个还是等等不要太急了

      // 这次要爬的消息index是多少，会查这个index及后4条数据，共5条数据
      const begin = total - (pageNum * (spideTime + 1) + hadSpideMsgNum)
      if (begin <= 0) {
        logger.log(`【正在爬取】公众号ID：${accID}，无新文章需爬取`)
      }

      logger.log(`【正在爬取】\n公众号ID：${accID}\nfakeid：${fakeid}\n消息index：${begin}\n消息总数：${total}`)

      const [artiPageNum, nowTotal, succNum] = await t.spideOneTime(accID, fakeid, begin, total) || []

      // 历史数据全部爬完了
      if (!artiPageNum) {
        logger.log(`【正在爬取】已完成全部历史数据！公众号ID：${accID}`)
        await articleModel.setHistoryHadFinish(accID)
        return true
      }

      // 有爬取到数据，但是成功存入数据库的没有，有可能是这些数据都在数据库里了，为了防止死循环查已有数据，就不继续了
      if (!succNum) {
        logger.log('【正在爬取】严重错误！爬取到了数据，但是全都无法存入数据库')
        return false
      }

      // 正常情况，已经爬成功 succNum 条了，继续爬
      if (nowTotal === total) {
        logger.log(`【正在爬取】公众号ID：${accID}\n本次成功存储${succNum}条数据，本次共有${artiPageNum}条数据！\n消息总数：${total}`)
        spideTime++
      } else {
        logger.log(`【正在爬取】公众号ID：${accID}\n公众号在爬取过程中，发布新文章了！\n消息总数：${nowTotal}`)
        // 公众号在爬取过程中，发布新文章消息了
        total = nowTotal
        articleModel.updateTotalMsgNum(accID, nowTotal)
      }
      if (awaitUntilFinish) {
        await interval()
      } else {
        interval()
      }
    }
  },

  /**
   * 执行一次爬取历史数据的任务，因为微信后台一次最多5条，所以这里也一次最多5条，并且因为微信是倒叙的，所以这里要注意顺序
   *
   * ps. 最近微信好像出bug了，一口气给40条数据
   * @param accID 我们公众号数据库的id
   * @param fakeid 微信后台对这公众号的唯一识别
   * @param begin 从哪条数据开始，最新的那条数据为0
   * @param lastTotal 上一次获取时的总文章数，用于及时发现文章数变了
   * @param onlyCount 是否只查文章数量就行
   * @return 如果获取失败，会返回false，
   * 如果成功了，会返回一个数组，第一个值是本次更新的文章数量，第二个是总消息数，第三个是本次成功更新的文章数（注意消息和文章的区别）
   * 如果发现文章总数变了，会返回与成功一样的数组，并且本次获取的数据不会存到数据库，可以根据总数与上次的是否一致来判断有没有存到数据库
   * */
  async spideOneTime (accID, fakeid, begin, lastTotal, onlyCount) {
    const token = await getWxToken()
    const qs = {
      token: token,
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      random: Math.random(),
      action: 'list_ex',
      begin: begin,
      count: '5', // 这个5，指的是5条消息，而不是5篇文章，一条消息可以有很多文章！而这个接口查出来的数组，是文章列表，不是消息，所以会出现超过5条结果
      query: '',
      fakeid: fakeid, // 公众号唯一识别
      type: '9'
    }
    const url = `https://mp.weixin.qq.com/cgi-bin/appmsg`

    const wxLoginCookies = await getWxCookie()
    const referer = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&token=${token}&lang=zh_CN`

    const { headers, body } = await hReq.get(url, qs, { ua, referer, cookie: wxLoginCookies })
    saveWxCookie(headers['set-cookie'])

    const total = body.app_msg_cnt || 0

    if (!body.app_msg_list || !total) {
      if (body.base_resp && body.base_resp.ret === 200013) {
        spideWaitTime *= 2
        logger.log(`【爬】获取文章列表接口访问太频繁，接下来等待时间将变成：${spideWaitTime / 1000}s`)
        return false
      }
      // 很可能是session过期了，不用继续了
      // { base_resp: { err_msg: 'freq control', ret: 200013 } }
      logger.log(`【爬】无法获取文章列表`, body)
      return false
    }

    // 文章总数，如果发现总数变了，那获取方式要变
    if (onlyCount || !body.app_msg_list.length || parseInt(total) !== parseInt(lastTotal)) {
      return [body.app_msg_list.length, total, 0]
    }

    let succNum = 0

    // 倒着遍历
    for (const item of body.app_msg_list.reverse()) {
      // aid: "2665539572_1"
      // appmsgid: 2665539572
      // cover: "https://mmbiz.qlogo.cn/mmbiz_jpg/VXm8w4GIZRrlM8e7mfBv1hNnUYAiaucFEPKrjolUMkiaaOv1EMCLpGMiavO1Uhz3YHeWkwrX0ebtlx5zniaY0pqiaUA/0?wx_fmt=jpeg"
      // digest: "."
      // item_show_type: 0
      // itemidx: 1
      // link: "http://mp.weixin.qq.com/s?__biz=MjM5MDI5OTkyOA==&mid=2665539572&idx=1&sn=726ae5d0230c4dc79b65a80ee25ad16c&chksm=bd52a5838a252c952030e41879691ab7ff013c3533ddf44796dc6617170f00dfcfc187ac71ec#rd"
      // title: "她把姨太太跳舞的42㎡舞厅，改成6个空间的单身公寓，赚了！"
      // update_time: 1541894173

      // 查一下数据库里有没有
      const has = await articleModel.hadSpide(accID, item.aid)
      if (has) {
        continue
      }

      logger.log(`【爬】文章地址：${item.link}`)

      const res = await hSpider.downloadPage(item.link)
      const waitTime = hTools.rand(2500, 3800)
      if (res[0] === 200) {
        logger.log(`【爬】文章爬下来了`)

        // 要重写html，因为 downloadPage 方法是把html存文件，它的静态资源路径是相对于html文件的位置
        // 而存数据库的html需要相对于本服务的www目录

        // 把前面的静态文件文件夹去掉，那个是www文件夹，对外来说，是无需www文件夹的
        const path = `${res[2].path.replace(/^\/?[^/]*\//, '')}/`

        const $ = res[2].queryObj

        // 把图片的src加上前缀路径，因为在sql中的html，到时候获取的时候，图片路径要是直接路径
        $('body img').each((i, el) => {
          const $el = $(el)
          // $el.attr('data-src', path + $el.attr('src'))
          $el.attr('src', myOrigin + '/' + path + $el.attr('src'))
        })

        // 存数据库
        const createRes = await articleModel.create(0, {
          title: res[2].title,
          content: $('body').html(),
          down_from_url: url,
          static_dir: path,
          css_dir: ($('head link').attr('href') || '').replace(/^(\.\.\/)*/, ''), // 把开头所有的 ../ 去掉
          wx_account_id: accID,
          wx_aid: item.aid
        })

        if (createRes[0] !== 200) {
          logger.log(`【爬】文章存储失败了，可能是数据库问题，已停止爬取了`)
          return false // 数据库出问题了，估计是某篇文章的字段存的时候发生了什么问题，可能标题过长什么的
        }

        succNum++

        await articleModel.incrHadSpideNum(accID)

        logger.log(`【爬】文章存储成功，等待${waitTime}ms后继续下一篇`)
      } else {
        logger.log(`【爬】文章没能爬下来，等待${waitTime}ms后继续下一篇`)
      }

      await hTools.setTimeout(waitTime) // 放慢点
    }

    return [body.app_msg_list.length, total, succNum]
  },

  /**
   * 原计划从微信爬历史文章，从清博指数查新文章，但是现在看来干脆都从微信爬算了
   * 查询清博指数是否有相同公众号，清博指数那边是用来爬以后的新文章，微信那里是用来爬历史文章
   * @param nickname 公众号名，用于搜索的关键词
   * @param alias 公众号微信号
   * @return 如果搜到上述微信号，则返回string格式，是公众号在清博指数的sid，否则返回一个数组，是根据关键词在清博指数中找到的所有公众号
   * */
  async getWXFromGsdata (nickname, alias) {
    logger.log(`正在向清博指数查询“${nickname}(${alias})”`)
    const url = `http://www.gsdata.cn/query/wx`
    const { body } = await hReq.get(url, {
      q: nickname
    }, { type: 'text', ua })
    logger.log('清博指数有数据：', body)
    const cheerio = require('cheerio')
    const $ = cheerio.load(body)
    const $lis = $('.imgword-list .list_query')
    let sid = ''
    const datas = []
    $lis.each((i, li) => {
      const data = {}
      const $t = $(li)

      data.wechat = trim($t.find('.wxname').text()) || '' // 公众号微信号
      if (data.wechat === alias) {
        const $nickname = $t.find('#nickname')
        const [, wxname] = $nickname.attr('href').match(/wxname=([^?&]*)/) || []
        sid = wxname || ''
        return false
      }

      const $nickname = $t.find('#nickname')

      const headimgStr = $t.find('.img').attr('style')
      const [, headimg] = (headimgStr && headimgStr.match(/url\("?'?(.*)"?'?\)/)) || []

      const [, wxname] = $nickname.attr('href').match(/wxname=([^?&]*)/) || []

      data.wxname = wxname || '' // 该公众号在清博指数的sid
      data.nickname = $nickname.text() || '' // 公众号昵称
      data.headimg = headimg || ''
      data.introduction = $t.find('.word-bd .pro .p-label').eq(0).text() || ''

      datas.push(data)
    })
    return sid || datas
  },

  /**
   * 原计划从微信爬历史文章，从搜狗查新文章，但是现在看来干脆都从微信爬算了
   * 从搜狗找到这个公众号
   * @param nickname
   * @param alias
   * @param sid string 如果有这个参数，则不会根据公众号来确定唯一，而是根据这个值，并且如果匹配成功，会返回该公众号的全部参数
   * */
  async getWXFromSougou (nickname, alias, sid) {
    logger.log(`正在向搜狗查询“${nickname}(${alias})”`)
    const qs = {
      type: 1,
      s_from: 'input',
      query: nickname,
      ie: 'utf8',
      _sug_: 'n',
      _sug_type_: ''
    }
    const url = 'https://weixin.sogou.com/weixin'
    const { body } = await hReq.get(url, qs, { type: 'text', ua })
    logger.log('搜狗有数据')
    const cheerio = require('cheerio')
    const $ = cheerio.load(body)
    const $lis = $('.news-list2>li')
    let retData = {}
    const datas = []
    $lis.each((i, li) => {
      const data = {}
      const $t = $(li)

      data.wechat = trim($t.find('.info [name=em_weixinhao]').text()) || '' // 公众号微信号
      if (!sid && data.wechat === alias) {
        data.sid = $t.attr('d') || ''
        if (data.sid) {
          retData = data
          return false
        }
      }

      data.wxname = $t.attr('d') || '' // 该公众号在搜狗微信的sid
      data.nickname = trim($t.find('.txt-box .tit a').text()) || '' // 公众号昵称
      data.headimg = $t.find('.img-box img').attr('src') || ''
      data.introduction = $t.find('dl dd').text() || ''
      data.href = $t.find('.txt-box .tit a').attr('href') || '' // 文章链接

      if (sid && data.wxname === sid) {
        retData = data
        return false
      }

      datas.push(data)
    })
    return sid ? retData : (retData.sid || datas)
  },

  // 启动爬虫任务，这里会控制不会启动多次的
  async startSpide () {
    if (!spiding) {
      spiding = true
      spideWaitTime = spideWaitTimeCache // 重置等待时间
      await this.spideNewArticleByMP()
    } else {
      logger.log('【爬取队列】正在运行，无需启动')
    }
  },

  /**
   * 启动爬取队列执行器。
   * 使用微信后台的接口更新文章，这样做就只能要求运营每隔一段时间登录一次微信后台了
   * 只要每次登录微信公众号，这里就会启动
   * */
  async spideNewArticleByMP () {
    if (await this.ifNeedLogin()) {
      logger.log('【爬取队列停止】没有登录，已停止爬取')
      spiding = false
      return
    }
    const accounts = await articleModel.getAllNeedNewArticle()
    logger.log(`【爬取队列】需要爬取的公众号有${(accounts && accounts.length) || 0}个`)

    if (accounts && accounts.length) {
      if (accounts.length !== lastAccountNum) {
        lastAccountNum = accounts.length
        for (const item of accounts) {
          try {
            logger.log(`【爬取队列】当前正在爬：${item.nickname}`)
            await this.spideHistory(item.id, item.fakeid, true)
            await hTools.setTimeout(hTools.rand(spideWaitTime, spideWaitTime * 2)) // 这个还是等等不要太急了
          } catch (e) {
            logger.log('【爬取队列错误】', e)
          }
        }
      } else {
        logger.log(`【爬取队列】没有新增公众号，等待下一次看看有没有公众号`)
      }
    }
    // 如果session还有，就循环执行自己
    await hTools.setTimeout(5000)
    this.spideNewArticleByMP()
  }
}
