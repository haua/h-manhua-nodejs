/**
 * 秒表
 *
 * 用于记录耗时，精确到毫秒
 *
 * ps. 为了方便使用，可以直接 Stopwatch.mark() 获得距离上次调用 Stopwatch.mark() 的时间差
 * ps. Stopwatch.mark() 支持传入一个自定义的 name 来指定不同的秒表，name 支持使用 Symbol 值
 * ps. 同时 new Stopwatch() 的方式创建一个不同的秒表，根据各人喜好
 * */

const defKey = Symbol('default')
const timmers = {}

const ret = function (msec) {
  const sec = (msec / 1000) | 0
  const min = (sec / 60) | 0
  const hour = (min / 60) | 0
  const day = (hour / 24) | 0
  const year = (day / 365) | 0
  const r = {
    total: msec,
    msec: msec % 1000,
    sec: sec % 60,
    min: min % 60,
    hour: hour % 24,
    day: day % 365,
    year: year
  }

  r.msg =
    (r.year ? `${r.year}年` : '') +
    (r.day ? `${r.day}天` : '') +
    (r.hour ? `${r.hour}小时` : '') +
    (r.min ? `${r.min}分` : '') +
    (r.sec ? `${r.sec}秒` : '') +
    (r.msec ? `${r.msec}毫秒` : '')

  return r
}

module.exports = class Stopwatch {
  constructor () {
    this.times = [new Date()]
  }

  mark () {
    const time = new Date()
    this.times.push(time)
    return ret(time - this.times[this.times.length - 2])
  }

  static new () {
    return new Stopwatch()
  }

  static get ret () {
    return ret
  }

  static mark (name) {
    name = name || defKey
    if (!timmers[name]) {
      timmers[name] = new Stopwatch()
      return ret(0)
    }
    return timmers[name].mark()
  }

  // 清零，清不清其实无所谓，主要是能节约点内存吧。
  // timmers[name] 不能使用 weekset 因为 timmers[name] 里的东西很容易会失去引用
  static clear (name) {
    name = name || defKey
    timmers[name] = false
  }
}
