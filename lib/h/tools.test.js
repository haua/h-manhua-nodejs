const assert = require('assert')

const hTools = require('./tools')

describe('hTools', () => {
  describe('mapKeyToCamel', () => {
    it('转换2层', () => {
      const res = hTools.mapKeyToCamel({
        abc_def_gh: 1,
        abc_def_ghi: {
          jkl_mno_pq: {
            rst_uvw: 1
          }
        }
      }, 2)

      assert.strictEqual(JSON.stringify(res), '{"abcDefGh":1,"abcDefGhi":{"jklMnoPq":{"rst_uvw":1}}}')
    })
    it('转换数组', () => {
      const res = hTools.mapKeyToCamel({
        abc_def_gh: 1,
        abc_def_ghi: [{
          jkl_mno_pq: {
            rst_uvw: 1
          }
        }]
      })

      assert.strictEqual(JSON.stringify(res), '{"abcDefGh":1,"abcDefGhi":[{"jklMnoPq":{"rstUvw":1}}]}')
    })
    it('转换数组2', () => {
      const res = hTools.mapKeyToCamel({
        data: {
          page: 0,
          page_size: 15,
          more_page: 0,
          total: -1,
          list: [ {
            id: 18,
            sid: '17968JxCW8N',
            pid: 0,
            belong: 2,
            uid: 2,
            title: '从0到100亿，名创优品的营销策略究竟有何高招？',
            cover: '',
            tags: '',
            num_complainted: 0,
            num_viewed: 0,
            num_fav: 0,
            num_share: 0,
            sort: 500,
            on_shelf: 0,
            on_shelf_time: null,
            state: 0,
            intro: '',
            wx_account_id: 0,
            wx_aid: '',
            create_from: 1,
            down_from_url: 'https://mp.weixin.qq.com/s/detD4PpBcmlbfechftNwfg',
            copyright: 0,
            spide_status: 1,
            css_dir:
              'https://temp.aijiatui.com/op/www/spider_public/css/weixin.css',
            d_flag: 0,
            c_time: '2019-03-13 17:44:46',
            m_time: '2019-03-13 17:44:51'
          } ]
        },
        code: 200,
        msg: 'ok',
        t: 1552529044513
      })

      assert.strictEqual(JSON.stringify(res), '{"abcDefGh":1,"abcDefGhi":[{"jklMnoPq":{"rstUvw":1}}]}')
    })
  })

  describe('strToCamel', () => {
    it('正常转换', () => {
      const res = hTools.strToCamel('abc_def_hij_522_8d')
      assert.strictEqual(res, 'abcDefHij5228d')
    })
    it('_在前', () => {
      const res = hTools.strToCamel('_abc_def_hij_522_8d')
      assert.strictEqual(res, 'AbcDefHij5228d')
    })
  })

  describe('objectFilter', () => {
    it('正常转换-不能修改原始obj', () => {
      const obj = { a: 'abc_def_hij_522_8d', b: 'b', c: 'c', e: false }
      const res = hTools.objectFilter(obj, ['b', 'd', 'e'])
      assert.strictEqual(JSON.stringify(res), '{"b":"b","e":false}')
      assert.strictEqual(JSON.stringify(obj), '{"a":"abc_def_hij_522_8d","b":"b","c":"c","e":false}')
    })
    it('带false等值', () => {
      const res = hTools.objectFilter({ a: null, b: 0, c: '', d: false, e: undefined }, ['a', 'b', 'c', 'd', 'e'])
      assert.strictEqual(JSON.stringify(res), '{"a":null,"b":0,"c":"","d":false}')
    })
  })
})
