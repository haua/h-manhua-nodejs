const assert = require('assert')

const lib = require('./img')

describe('图片', () => {
  describe('图片宽高', () => {
    it('在线图片', async function () {
      const res = await lib.sizeOf('https://temp.aijiatui.com/bob-dev/articles/img/18003ipoA8Ku16sIEwe2dBvBiM0JzM_4')
      console.log('结果', res)
      assert.strictEqual(res.width, 1080)
    })
    it('不是图片', async function () {
      const res = await lib.sizeOf('https://temp.aijiatui.com/bob-test/articles/json/566326904320180224.json')
      console.log('结果', res)
      assert.strictEqual(res, false)
    })
  })
})
