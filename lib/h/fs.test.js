const assert = require('assert')

const path = require('path')
const hFs = require('./fs')

describe('hFs', () => {
  describe('mkdir', () => {
    it('创建多级目录', async function () {
      const res = await hFs.mkdir('./ggg/sss/aaa')
      assert.strictEqual(res, true)
    })
  })
  describe('getPath', () => {
    it('正常状态-使用/', function () {
      const res = hFs.getPath('/ggg/sss/aaa')
      assert.strictEqual(res, '/ggg/sss/')
    })
    it('正常状态-使用path.join', function () {
      const res = hFs.getPath(path.join(__dirname, '/ggg/sss/aaa'))
      assert.strictEqual(res, path.join(__dirname, '/ggg/sss/'))
    })
    it('无需替换-使用/', function () {
      const res = hFs.getPath('/ggg/sss/aaa/')
      assert.strictEqual(res, '/ggg/sss/aaa/')
    })
    it('无需替换-使用path.join', function () {
      const res = hFs.getPath(path.join(__dirname, '/ggg/sss/aaa/'))
      assert.strictEqual(res, path.join(__dirname, '/ggg/sss/aaa/'))
    })
  })

  describe('压缩', () => {
    const fileDir = './fs_test'
    it('压缩多文件', async () => {
      const res = await hFs.zip([
        path.join(__dirname, fileDir, 'a.js'),
        path.join(__dirname, fileDir, 'sun_code_of_uid_2.jpg')
      ], path.join(__dirname, fileDir, 'test.zip'))

      assert.strictEqual(res[0], 200)
      const data = await hFs.readFile(path.join(__dirname, fileDir, 'test.zip'))
      assert.strictEqual(!data, false)
    })
  })

  describe('删除文件夹', () => {
    const fileDir = './fs_test'
    it('should ', async () => {
      const res = await hFs.deleteFolder(path.join(__dirname, fileDir))
      assert.strictEqual(res, true)
    })
  })
})
