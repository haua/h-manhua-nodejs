const assert = require('assert')

const hHtml = require('./html')

describe('html处理', () => {
  describe('生成table', async () => {
    it('生成', async () => {
      const html = hHtml.createTable([[1, 2]], ['测试1', '测试2'])
      assert.strictEqual(html, '<table border="1" cellspacing="0"><tr><th>测试1</th><th>测试2</th></tr><tr><td>1</td><td>2</td></tr></table>')
    })
  })
})
