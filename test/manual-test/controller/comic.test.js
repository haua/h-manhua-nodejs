const hReq = require('../../../lib/h/request')
const assert = require('assert')

// const url = 'https://haua.cn/h-comic/'
const url = 'http://127.0.0.1:7001'

describe('漫画', () => {
  describe('查询列表', () => {
    it('第一页', async () => {
      const { body, error } = await hReq.get(url + '/comic/page', {
        page: 1,
        pageSize: 2,
        needTotal: 1
      })
      console.dir(body, {
        depth: 10
      })
      if (error) {
        console.error(error)
      }

      assert.strictEqual(body.code, 200)
    })
  })
  describe('查询指定漫画', () => {
    it('正常查', async () => {
      const { body, error } = await hReq.get(url + '/comic/sid', {
        sid: 'asdqweer12e'
      })
      console.dir(body, {
        depth: 10
      })
      if (error) {
        console.error(error)
      }

      assert.strictEqual(body.code, 200)
    })
  })
  describe('查询指定画的详情内容', () => {
    it('正常查', async () => {
      const { body, error } = await hReq.get(url + '/comic/episode', {
        sid: 'gesre'
      })
      console.dir(body, {
        depth: 10
      })
      if (error) {
        console.error(error)
      }

      assert.strictEqual(body.code, 200)
    })
  })
})
