const assert = require('assert')

const lib = require('./memory')

describe('memory', () => {
  describe('lock', () => {
    it('少量测试', () => {
      const lockSucc = []
      let now = Date.now()
      for (let i = 0; i < 90000; i++) {
        const res = lib.lock('test1', 10)
        if (res) {
          lockSucc.push(res)
        }
      }

      const msec = Date.now() - now
      const expect = Math.floor(msec / 10) + 1
      console.log(`间隔${msec}毫秒，应有${expect}个值，实际有${lockSucc.length}个`)
      assert.strictEqual(lockSucc.length, expect)
    })
    it('常规测试', () => {
      const lockSucc = []
      let now = Date.now()
      for (let i = 0; i < 1000000; i++) {
        const res = lib.lock('test1', 10)
        if (res) {
          lockSucc.push(res)
        }
      }

      const msec = Date.now() - now
      const expect = Math.floor(msec / 10) + 1
      console.log(`间隔${msec}毫秒，应有${expect}个值，实际有${lockSucc.length}个`)
      assert.strictEqual(lockSucc.length, expect)
    })
  })
})
