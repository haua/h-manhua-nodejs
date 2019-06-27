
const assert = require('assert')

const $ = require('meeko')
const Stopwatch = require('./stopwatch')

describe('秒表', async () => {
  it('启动', async () => {
    const res = Stopwatch.mark()
    console.log(res)
    assert.strictEqual(res.msec, 0)
  })

  it('第一次测试', async () => {
    await $.wait(123)
    const res = Stopwatch.mark()
    console.log(res)
    assert.strictEqual(res.msec < 135 && res.msec >= 123, true)
  })

  it('第二次测试', async () => {
    await $.wait(12)
    const res = Stopwatch.mark()
    console.log(res)
    assert.strictEqual(res.msec < 20 && res.msec >= 12, true)
  })

  it('清除', async () => {
    await $.wait(12)
    Stopwatch.clear()
    const res = Stopwatch.mark()
    console.log(res)
    assert.strictEqual(res.msec, 0)
  })

  it('时长换算-1分钟内', async () => {
    const res = Stopwatch.ret(25 * 1000 + 255)
    console.log(res)
    assert.strictEqual(res.sec, 25)
    assert.strictEqual(res.msec, 255)
  })

  it('时长换算-1小时内', async () => {
    const res = Stopwatch.ret(25 * 60 * 1000 + 12255)
    console.log(res)
    assert.strictEqual(res.min, 25)
    assert.strictEqual(res.sec, 12)
    assert.strictEqual(res.msec, 255)
  })

  it('时长换算-1天内', async () => {
    const res = Stopwatch.ret(4 * 60 * 60 * 1000 + 25 * 60 * 1000 + 12255)
    console.log(res)
    assert.strictEqual(res.hour, 4)
    assert.strictEqual(res.min, 25)
    assert.strictEqual(res.sec, 12)
    assert.strictEqual(res.msec, 255)
  })

  it('时长换算-10年内', async () => {
    const res = Stopwatch.ret(3 * 365 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000 + 25 * 60 * 1000 + 12255)
    console.log(res)
    assert.strictEqual(res.year, 3)
    assert.strictEqual(res.day, 0)
    assert.strictEqual(res.hour, 4)
    assert.strictEqual(res.min, 25)
    assert.strictEqual(res.sec, 12)
    assert.strictEqual(res.msec, 255)
  })
})
