// 基于 PhantomJS（https://www.npmjs.com/package/phantom） 的爬虫，
// 可以把整个网页包含所有资源都爬下来

const phantom = require('phantom')
const hTools = require('../htools')

const uas = [
  // iphoneX
  'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'
]

// 特殊的网站，就用特殊的方式获取
const specialHost = [
  'mp.weixin.qq.com'
]

module.exports = {
  async get () {
    let url = 'https://h5.eqxiu.com/s/YEbHyKeF'
    const host = url.match(/^https?:\/\/([^/]+)/i)[1] // match 里第二个才是括号里匹配到的

    const instance = await phantom.create()
    const page = await instance.createPage()
    // 启用js，false是禁止
    await page.setting('javascriptEnabled', true)
    await page.property('viewportSize', { width: 414, height: 700 })

    // 设置 ua MicroMessenger/6.7.3.1360(0x26070333)
    await page.setting('userAgent', uas[0])

    await page.on('onResourceRequested', function (requestData, networkRequest, out) {
      let msg = requestData.url
      // if (msg.length > 100) {
      //   msg = msg.slice(0, 100) + '...'
      // }
      console.info('正在请求：', msg)
      // console.info('请求networkRequest：', networkRequest)
      // console.info('请求out：', out)
    })

    // 打开指定的链接
    const status = await page.open(url)
    const content = await page.property('content')

    console.log('初始请求完成！')

    // 执行一下代码
    // await page.evaluate(function () {
    //   (function scroll () {
    //     setTimeout(function () {
    //       document.body.scrollTop += 700
    //
    //       console.log('滚动一次：', document.body.scrollTop)
    //       if (document.body.scrollTop <= document.body.scrollHeight) {
    //         scroll()
    //       }
    //     }, 100)
    //   }())
    // })

    // await page.evaluateJavaScript(
    //   `
    //   (function scroll () {
    //     setTimeout(function () {
    //       document.body.scrollTop += 700;
    //
    //       console.log('滚动一次：', document.body.scrollTop);
    //       if (document.body.scrollTop <= document.body.scrollHeight) {
    //         scroll();
    //       }
    //     }, 100);
    //   }());
    //   `
    // )

    await hTools.setTimeout(10000)

    await page.render(`./www/${host}.png`)

    console.log('请求完成！')

    // await page.close()
    // instance.exit()
    return {
      status,
      content
    }
  }
}
