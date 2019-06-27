const assert = require('assert')

const $ = require('meeko')

const hFsCache = require('./fs-cache')

describe('hFsCache', () => {
  describe('cache', async () => {
    it('不会过期', async () => {
      await hFsCache.cache('test1', '测试的数据啦')
      await $.wait(1500)
      const res = await hFsCache.cache('test1', '测试的数据啦')
      assert.strictEqual(res, true)
    })
    it('存', async () => {
      const res = await hFsCache.cache('test1', '测试的数据啦', 1)
      assert.strictEqual(res, true)
    })
    it('取', async () => {
      const res = await hFsCache.cache('test1')
      assert.strictEqual(res, '测试的数据啦')
    })
    it('自动释放', async () => {
      await $.wait(1000)
      const res = await hFsCache.cache('test1')
      assert.strictEqual(res, undefined)
    })
    it('删', async () => {
      await hFsCache.cache('test1', '测试的数据啦', 1)
      const res = await hFsCache.cache('test1', null)
      assert.strictEqual(res, true)
    })
  })

  describe('listCache', () => {
    it('add', async () => {
      const res = await hFsCache.listAdd('test2', '参数3')
      assert.strictEqual(res, true)
    })
    it('each', async function () {
      const res = await hFsCache.listEach('test2', (line) => {
        console.log(11111, line)
      })
      assert.strictEqual(res, true)
    })
  })
})
