let limitCountDown

/**
 * 倒计时方法
 *
 * 使用方法： import之后： CountDown.start(60, (remainSec)=>{})
 * */
module.exports = class CountDown {
  constructor () {
    this.isStop = false
    this.sec = 0
    this.fn = undefined
    this.every = 1
    this.startTime = 0
    this.remainSec = 0
  }

  /**
   * 倒计时快速使用本类的方法
   * @param sec 一共倒计时多少秒，从调用此函数开始倒计时
   * @param fn 倒计时结束和每隔多少秒回调的函数。调用此函数时，不会马上回调。回调参数是还剩余多少秒
   * @param every 设定每隔多少秒回调一次。默认1秒
   * */
  static start (sec, fn, every) {
    return new CountDown().start(sec, fn, every)
  }

  /**
   * 专门用于倒计时结束前不能重复执行某操作，比如发短信验证码
   *
   * */
  static limit (sec, actionFn, everySecFn) {
    if (!limitCountDown) {
      limitCountDown = new CountDown()
    }
    if (limitCountDown.remainSec > 0) {
      console.error(`请等${limitCountDown.remainSec}秒后再试哦`)
    } else {
      limitCountDown.remainSec = 0
    }
    const res = actionFn()
    if (res) {
      if (res.then) {
        res.then(function (res) {
          if (res) {
            limitCountDown.start(sec, everySecFn)
          }
        })
      } else {
        limitCountDown.start(sec, everySecFn)
      }
    }
  }

  /**
   * 倒计时
   * @param sec 一共倒计时多少秒，从调用此函数开始倒计时
   * @param fn 倒计时结束和每隔多少秒回调的函数。调用此函数时，不会马上回调。回调参数是还剩余多少秒
   * @param every 设定每隔多少秒回调一次。默认1秒
   * */
  start (sec, fn, every) {
    const t = this
    t.sec = sec
    t.fn = fn
    t.every = every || 1
    t.isStop = false
    t.startTime = new Date().getTime()

    t.interval()
  }

  interval () {
    if (this.isStop) { return }
    const t = this

    const nowTime = new Date().getTime()

    const remainSec = t.sec - Math.round((nowTime - t.startTime) / 1000)

    if (remainSec > 0) {
      setTimeout(t.interval.bind(t), (remainSec < t.every ? remainSec : t.every) * 1000)
    }
    t.remainSec = remainSec > 0 ? remainSec : 0
    t.fn(remainSec)
  }

  stop () {
    this.isStop = true
  }
}
