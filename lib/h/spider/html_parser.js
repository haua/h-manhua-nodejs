// 解析下载回来的html中的元素，比如 解析img标签，把图片下载回来后更改img里的src属性
const logger = new (require('../../log'))('html解析')
const cheerio = require('cheerio')
const $meeko = require('meeko')
const utils = require('./utils')
// const path = require('path')
const hfs = require('../fs')
const hImg = require('../img')

// 爬下来的html、图片等资源放置在哪个路径下
const pathOnCloud = require('../../../config').articlesPathOnCloud || 'articles'

const htmlTemp = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" name="viewport">
    <title></title>
</head>
<body></body>
</html>`

// 特殊的网站，在某个阶段有特殊的做法
const specialHost = {
  'mp.weixin.qq.com': {
    ua: 'iphoneX',
    css: 'https://cos-bob.aijiatui.com/bob/www/spider_public/css/weixin.css', // 需要外挂这个css才能更好的显示
    async other ($, url, origin, ua) {
      // 微信的页面下载回来很大，删掉部分
      // $('script').remove()
      // // 二维码去掉
      // $('.rich_media_meta_list').remove()
      // $('.reward_qrcode_area').remove()
      //
      // // 下载图片
      // const imgs = $('img')
      // await this.downloadImgs(imgs, url, ua)

      const $n = cheerio.load(htmlTemp)
      const $div = $n('<div id="docRoot" class="docRoot rich_media_area_primary"></div>')

      // 设置title
      this.title = ($('head title').text() || '').replace(/^[\s\n]+|[\s\n]+$/g, '') ||
        ($('.rich_media_title').text() || '').replace(/^[\s\n]+|[\s\n]+$/g, '')
      $n('head title').text(this.title)

      // 把原文章内容加进来
      // $div.append($('.rich_media_title')) // 标题
      const $author = $('.rich_media_meta_list')
      $author.find('#js_profile_qrcode').remove()
      this.author = $author.find('.rich_media_meta_text').text().trim()
      this.nickname = $author.find('.rich_media_meta_nickname').text().trim()
      $div.append($author) // 公众号信息
      // mp后台可以选择文章的封面是否加入正文，如果加入，则会有这个元素。但它是这样的：
      //   <div class="rich_media_thumb_wrp" id="media">
      //
      //     <script nonce="188860562">
      //     (function(){
      //       var cover = "http://mmbiz.qpic.cn/mmbiz_jpg/riaDdSMaKgSVCOfnh2tsU6AJFhsdDd2AFppkezmPCvk68dUXu559aic8OiaO15Z49qa3Zx2PmXt7fDE67pvlQlsNQ/0?wx_fmt=jpeg";
      //       var tempImg = document.createElement('img');
      //       tempImg.setAttribute('class', 'rich_media_thumb');
      //       tempImg.setAttribute('id', 'js_cover');
      //       tempImg.setAttribute('data-backsrc', cover);
      //       tempImg.setAttribute('data-src', cover);
      //       tempImg.setAttribute('onerror', 'this.parentNode.removeChild(this)');
      //
      //       document.getElementById('media').appendChild(tempImg);
      //
      //     })();
      // </script>
      $div.append($('.rich_media_content')) // 文章内容

      $div.find('script').remove()

      $n('body').append($div).addClass('zh_CN mm_appmsg  appmsg_skin_default appmsg_style_default')

      // 加上css
      // const cssContent = (await hfs.readFile('./www/spider_public/css/weixin.css') || '').toString()
      // $n('body').append(`<style rel="stylesheet" type="text/css">${cssContent}</style>`)

      // 因为要调用 this.downloadImgs ，所以要早点设置这个
      this.$ = $n

      // 下载图片
      await this.downloadImgs(url, ua)

      // 处理视频
      // <iframe class="video_iframe" data-vidtype="2"
      // data-cover="http%3A%2F%2Fshp.qpic.cn%2Fqqvideo_ori%2F0%2Ft0739lq4r5l_496_280%2F0"
      // allowfullscreen="" frameborder="0" data-ratio="1.7647058823529411" data-w="480"
      // data-src="https://v.qq.com/iframe/preview.html?width=500&amp;height=375&amp;auto=0&amp;vid=t0739lq4r5l">
      // </iframe>
      const $videoIframe = $div.find('iframe')
      if ($videoIframe.length) {
        $videoIframe.each((i, a) => {
          const $a = $n(a)
          const src_ = $a.attr('src') || $a.data('src') || ''

          const vid = (src_.match(/vid=([^;]*)/) || [])[1]

          if (vid && $a.data('mpvid')) { // 这种是用户在微信后台直接上传的视频，这种视频放在微信的服务器，不允许跨域，所以我们其实还是用不了的
            $a.attr('src', '//mp.weixin.qq.com/mp/readtemplate?t=pages/video_player_tmpl&auto=0&origin=https%3A%2F%2Fmp.weixin.qq.com&vid=' + vid)
          } else if (vid) { // 这种视频是在腾讯视频的，允许跨域
            $a.attr('src', '//v.qq.com/txp/iframe/player.html?origin=https%3A%2F%2Fmp.weixin.qq.com&vid=' + vid)
          } else {
            $a.attr('src', src_)
          }
          $videoIframe.attr(`data-src`, '')
        })
      }

      // 处理html标签里可能存在的background图片
      await this.downloadBackgroundImgs(url, ua)

      return $n
    }
  },

  // 头条抓的是pc版的，到时候要在手机端展现，所以整个html都要整改咯
  'www.toutiao.com': {
    ua: 'chrome', // 头条的下pc版的好
    css: 'https://cos-bob.aijiatui.com/bob/www/spider_public/css/toutiao.css',

    /**
     * 思路：
     * 头条现在把数据放在html的一个script里，
     * 这里根据字符串 articleInfo 找到这字符串形式的数据，
     * 然后把字符串转为对象再，再根据这数据生成我们需要的页面
     * */
    async other ($, url, origin, ua) {
      const $scritps = $('script')
      let jsonStr = ''
      for (let i = 0; i < $scritps.length; i++) {
        let jsStr = $($scritps[i]).html()
        if (!jsStr) { continue }
        const tarIndex = jsStr.indexOf('articleInfo')
        if (tarIndex < 0) continue

        jsStr = jsStr.slice(tarIndex)

        let startSymb = 0
        for (let letter of jsStr) {
          if (letter === '{') {
            startSymb++
          } else if (letter === '}') {
            startSymb--
            if (startSymb <= 0) {
              jsonStr += letter
              break
            }
          }

          if (startSymb > 0) {
            jsonStr += letter
          }
        }
      }

      if (jsonStr) {
        let data
        try {
          // data = JSON.parse(jsonStr)

          // 不是标准的json数据，所以只能eval， 不知道头条会不会在数据里藏代码
          // eslint-disable-next-line no-eval
          data = eval('(' + jsonStr + ')')
        } catch (e) {
          console.log('json解析失败：', jsonStr)
        }

        // 这里是确定找到我们需要的数据了
        if (data && data.content) {
          // console.log('看看是不是', data)
          data.content = $(`<div>${data.content}</div>`).text()

          const htmlTemp = await hfs.readFile('./www/spider_public/html_temp.html')
          const $n = cheerio.load(htmlTemp.toString())
          const $div = $n('<div id="docRoot" class="docRoot article padding-side"></div>')

          $n('head title').text(data.title)
          $div.append(`<div class="article__header"><h1 class="article__title">${data.title}</h1></div>`)
          $div.append(`<div class="article__content">${data.content}</div>`)
          $n('body').append($div)

          // 加上css
          // const cssContent = (await hfs.readFile('./www/spider_public/css/toutiao.css') || '').toString()
          // $n('body').append(`<style rel="stylesheet" type="text/css">${cssContent}</style>`)

          // 因为要调用 this.downloadImgs ，所以要早点设置这个
          this.$ = $n

          // 下载图片
          const imgs = $div.find('img')
          await this.downloadImgs(imgs, url, ua)

          return $n
        }
      }
    },

    // 头条居然改版了，这是老方法，可能以后用得着
    async other_old ($, url) {
      const htmlTemp = await hfs.readFile('./www/spider_public/html_temp.html')
      const $n = cheerio.load(htmlTemp.toString())
      const $div = $n('<div class="docRoot"></div>')

      // 设置title
      $n('head title').text($('head title').text())

      // 把原文章内容加进来
      $div.append($('.article-title'))
      $div.append($('.article-content'))
      $n('body').append($div)

      // 加上css
      const cssContent = (await hfs.readFile('./www/spider_public/css/toutiao.css') || '').toString()
      $n('body').append(`<style rel="stylesheet" type="text/css">${cssContent}</style>`)

      return $n
    }
  },

  // 这个网址是移动端的，要换成pc端的网址才能正确爬取
  'm.toutiao.com': 'www.toutiao.com',
  'm.toutiaocdn.cn': 'www.toutiao.com'
}

// 把上面值为字符串的属性设置一下
for (const [k, v] of Object.entries(specialHost)) {
  if (typeof v === 'string') {
    specialHost[k] = {
      getUrl (url) {
        return url.replace(k, v)
      }
    }
  }
}

module.exports = class {
  constructor (html, url) {
    this.html = html
    this.url = url
    this.$ = cheerio.load(html)

    this.specFns = {}

    this.imgI = 0
    this.imgSrcs = [] // 这篇文章内的所有图片地址，用于拿一张当封面图

    // 以下是爬取成功后，会设置好的数据，外部可以直接读这些属性
    this.title = ''
    this.author = '' // 作者，公众号的文章是可以填作者的
    this.nickname = '' // 公众号名字
  }

  // 静态属性，哈哈哈
  static get specialHost () {
    return specialHost
  }

  /**
   * await 这个方法，就开始爬了
   * @param needCover bool 是否需要获取封面图
   * */
  async init ({ needCover } = {}) {
    const { $, url } = this

    const [origin, host] = url.match(/^https?:\/\/([^/]+)/i) || [] // match 里第二个才是括号里匹配到的
    const specFns = specialHost[host] || {}

    this.specFns = specFns

    // 其他操作
    const $new = specFns.other && (await specFns.other.apply(this, [$, url, origin, specFns.ua]))
    if ($new) {
      this.$ = $new
    }

    if (needCover) {
      await this.getCoverByRule()
    }
  }

  /**
   * 根据一个规则从所有图片
   * W：H= 126 ，83
   * */
  async getCoverByRule () {
    // W：H= 126 ，83
    if (this.imgSrcs && this.imgSrcs.length) {
      this.cover = this.imgSrcs[0]
      for (let i = 0; i < this.imgSrcs.length; i++) {
        const res = await hImg.sizeOf(this.imgSrcs[i])
        if (res && res.height && res.width) {
          if (res.width >= 200 && res.height >= 200) {
            this.cover = this.imgSrcs[i]
            break
          }
        }
      }
    }
  }

  // 批量下载图片
  async downloadImgs (referer, ua) {
    const { $ } = this
    const imgs = $('img')
    let uuid = parseInt(new Date() / 1000 / 60 / 60 / 24).toString()
    uuid += $meeko.tools.uuid(32 - uuid.length - imgs.length.toString().length)
    const urls = []
    for (let i = 0; i < imgs.length; i++) {
      const $img = $(imgs[i])
      const thisDatas = $img.data() || {}
      let srcKey = 'src' // 一般懒加载的src会设到这里来

      if (!thisDatas[srcKey]) {
        Object.keys(thisDatas).some(k => {
          if (k.toLowerCase().includes('src')) {
            srcKey = k
            return true
          }
        })
      }

      let src = thisDatas[srcKey]

      if (!src) {
        src = $img.attr('src')
        srcKey = ''
      }

      if (!src) { continue }

      const imgSrc = `${pathOnCloud}/img/${uuid}-${i}`
      let dir
      let retryTime = 0
      // 尝试10次
      while (!dir && retryTime < 10) {
        if (retryTime > 0) {
          logger.error(`${src}重新上传第${retryTime}次`)
          await $meeko.wait(100)
        }
        dir = await utils.downloadFileToCloud(src, referer, imgSrc, ua)
        retryTime++
      }
      dir = dir || src // 上传失败了，也可以用回原来的地址
      if (dir) {
        urls.push(dir)

        // 统一设置到这来
        $img.attr('src', dir)

        if (srcKey) {
          // 以下的方法不会改变html元素的属性，只有用 attr 可以
          // $img.data(srcKey, imgSrc)
          $img.attr(`data-${srcKey}`, '')
        }
      }
      this.imgI = i
    }
    this.imgSrcs = urls
  }

  // 批量下载图片
  async downloadBackgroundImgs (referer, ua) {
    const { $, imgSrcs } = this
    let imgI = 0

    let uuid = parseInt(new Date() / 1000 / 60 / 60 / 24).toString()
    uuid += $meeko.tools.uuid(32 - uuid.length - 3)

    const allNode = $('*')
    for (let i = 0; i < allNode.length; i++) {
      const node = $(allNode[i])
      const style = node.attr('style') || ''
      if (style && style.includes('background')) {
        const [url] = style.match(/https?:\/\/[^"')]+/) || []
        if (url) {
          const imgSrc = `${pathOnCloud}/img/${uuid}-${++imgI}-background`
          let dir
          let retryTime = 0
          // 尝试10次
          while (!dir && retryTime < 10) {
            if (retryTime > 0) {
              logger.error(`${url}重新上传第${retryTime}次`)
              await $meeko.wait(100)
            }
            dir = await utils.downloadFileToCloud(url, referer, imgSrc, ua)
            retryTime++
          }
          if (dir) {
            logger.log(`图片 ${imgSrc} 上传成功`)
            imgSrcs.push(dir)
          }
          dir = dir || url // 上传失败了，也可以用回原来的地址
          const newStyle = style.replace(url, dir)
          node.attr('style', newStyle)
        }
      }
    }

    this.imgI += imgI
    this.imgSrcs = imgSrcs
  }

  // 外面想要这个
  getQueryObj () {
    return this.$
  }

  /**
   * 获取解析并处理完之后的html，返回的是string
   * */
  getHtml () {
    return this.$.html()
  }

  getCssUrl () {
    return this.specFns.css || ''
  }

  // 获取解析出的文章标题
  getTitle () {
    return this.$('head title').text().replace(/^\s+|\s$|\n+/g, '')
  }
}
