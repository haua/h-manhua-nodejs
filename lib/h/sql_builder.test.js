const assert = require('assert')

const sqlBuilder = require('./sql_builder')

describe('sqlBuilder', () => {
  describe('where用法', () => {
    it('基础用法', function () {
      const res = sqlBuilder.select('test', {
        a: 'b',
        b: 'a'
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE `a` = ? AND `b` = ?')
      assert.strictEqual(JSON.stringify(res.values), '["b","a"]')
    })
    it('字段顺序', function () {
      const res = sqlBuilder.select('test', {
        a: 1,
        c: 2,
        e: 3,
        i: 4,
        k: 5,
        j: 6,
        h: 7,
        f: 8,
        d: 9,
        b: 10
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE `a` = ? AND `c` = ? AND `e` = ? AND `i` = ? AND `k` = ? AND `j` = ? AND `h` = ? AND `f` = ? AND `d` = ? AND `b` = ?')
      assert.strictEqual(JSON.stringify(res.values), '[1,2,3,4,5,6,7,8,9,10]')
    })
    it('字段顺序2', function () {
      const select = {}
      select.a = 'b'
      select.c = 'b'
      select.e = 'b'
      select.i = 'b'
      select.k = 'b'
      select.j = 'b'
      select.h = 'b'
      select.f = 'b'
      select.d = 'b'
      select.b = 'b'
      const res = sqlBuilder.select('test', select)
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE `a` = ? AND `c` = ? AND `e` = ? AND `i` = ? AND `k` = ? AND `j` = ? AND `h` = ? AND `f` = ? AND `d` = ? AND `b` = ?')
    })
    it('相同字段多次出现2(推荐)', function () {
      const res = sqlBuilder.select('test', {
        a: {
          '!=': '',
          '!=#': 6,
          '!': 5,
          '=': 4,
          '>=': 1,
          '<': 10,
          '=#': [4, 5, 6],
          '!=#1': [7, 8, 9],
          'LIKE': '%love%',
          '=#1': null,
          '!#1': null
        }
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE (`a` != ? AND `a` != ? AND `a` != ? AND `a` = ? AND `a` >= ? AND `a` < ? AND `a` IN (?,?,?) AND `a` NOT IN (?,?,?) AND `a` LIKE ? AND `a` IS NULL AND `a` IS NOT NULL)')
      assert.strictEqual(JSON.stringify(res.values), '["",6,5,4,1,10,4,5,6,7,8,9,"%love%"]')
    })
    it('相同字段多次出现', function () {
      const res = sqlBuilder.select('test', {
        'a#2': {
          '!': 3
        },
        a: 'b',
        'a#': {
          '>=': 1
        },
        'a#1': {
          '<': 10
        }
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE `a` != ? AND `a` = ? AND `a` >= ? AND `a` < ?')
      assert.strictEqual(JSON.stringify(res.values), '[3,"b",1,10]')
    })
    it('AND', function () {
      const res = sqlBuilder.select('test', {
        'AND': {
          a: 'b',
          b: 'A'
        }
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE (`a` = ? AND `b` = ?)')
      assert.strictEqual(JSON.stringify(res.values), '["b","A"]')
    })
    it('OR', function () {
      const res = sqlBuilder.select('test', {
        'OR': {
          a: 'b',
          b: 'A',
          c: 'A',
          d: 'A'
        }
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE (`a` = ? OR `b` = ? OR `c` = ? OR `d` = ?)')
      assert.strictEqual(JSON.stringify(res.values), '["b","A","A","A"]')
    })
    it('AND和OR混用', function () {
      const res = sqlBuilder.select('test', {
        g: 1,
        'AND': {
          a: 2,
          b: 3
        },
        f: 4,
        'OR': {
          a: 5,
          b: 6,
          'AND': {
            a: 7,
            b: 8,
            'OR': {
              a: 9,
              b: 10
            }
          }
        },
        e: 11,
        'OR#': {
          a: 12,
          b: 13,
          c: [14]
        },
        d: 15
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE `g` = ? AND (`a` = ? AND `b` = ?) AND `f` = ? AND (`a` = ? OR `b` = ? OR (`a` = ? AND `b` = ? AND (`a` = ? OR `b` = ?))) AND `e` = ? AND (`a` = ? OR `b` = ? OR `c` IN (?)) AND `d` = ?')
      assert.strictEqual(JSON.stringify(res.values), '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]')
    })
    it('OR+', function () {
      const res = sqlBuilder.select('test', {
        'OR': {
          a: {
            '>=': 1,
            '<': 10
          },
          b: [2]
        },
        'OR#': {
          'a#OR': {
            '>=': 1,
            '<': 10
          },
          b: [2]
        }
      })
      assert.strictEqual(res.sql, 'SELECT * FROM `test` WHERE ((`a` >= ? AND `a` < ?) OR `b` IN (?)) AND ((`a` >= ? OR `a` < ?) OR `b` IN (?))')
      assert.strictEqual(JSON.stringify(res.values), '[1,10,2,1,10,2]')
    })
  })

  describe('insert用法', () => {
    it('单个insert', function () {
      const res = sqlBuilder.insert('user', {
        id: 999,
        name: '哈哈哈'
      })

      assert.strictEqual(res.sql, 'INSERT INTO `user` (`id`,`name`) VALUES (?,?)')
    })
    it('多个insert', function () {
      const res = sqlBuilder.insert('user', [{
        id: 999,
        name: '哈哈哈'
      }, {
        id: 888,
        name: 'yoyoyo'
      }])

      assert.strictEqual(res.sql, 'INSERT INTO `user` (`id`,`name`) VALUES (?,?),(?,?)')
    })
  })
})
