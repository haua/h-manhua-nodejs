const assert = require('assert')

const hStr = require('./string')

describe('hString', () => {
  describe('json解析', () => {
    it('bigInt的replace尝试', () => {
      // const oriStr = `{
      //   "list":
      //     [
      //       { "companyId": 487691313471291392, "id": 123456789 },
      //       { "companyId": 492713777091837952, "id": ":123456789123456789" }
      //     ]
      // }`.replace(/\n+|\s+/g, '')
      const oriStr = `{"list": [{"companyId": 487691313471291392,"id": 123456789},{
"companyId": 492713777091837952
}
]
}`
      console.log(11111, oriStr)
      const str = oriStr.replace(/([{[,\n\s]"[^"]*"[\n\s]*:[\n\s]*)(\d{15,})/g, `$1"$2"`)
      console.log(22222, str)
      console.log(33333, JSON.parse(str))
    })
    it('含bigInt的JSON解析', () => {
      const res = hStr.jsonDecode(`{"list": [{"companyId": 487691313471291392,"id": 123456789},{
"companyId": 492713777091837952
}
]
}`, {
        bigIntToStr: true
      })

      console.log(res)

      assert.strictEqual(res && res.list && res.list[0] && res.list[0].companyId, '487691313471291392')
    })
  })
})
