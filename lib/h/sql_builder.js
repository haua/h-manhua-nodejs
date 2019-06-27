/**
 * 构建sql语句，仅仅是构建，不会执行哦
 *
 * 用这里的方法构建的sql语句，会是这种形式返回：
 * {
 * sql: 'SELECT * FROM `books` WHERE `author` = ?',
 * timeout: 40000, // 40s
 * values: ['David']
 * }
 *
 * 这种格式可以直接传入mysql的query的第一个参数
 * */
const _ = require('lodash')
const logger = new (require('../log'))('sql_builder')

const trim = function (str) {
  return str.replace(/^\s+|\s$/, '')
}

module.exports = {
  timeout: 0,
  /**
   * 设置超时时间
   * @param mil 超时时间，单位毫秒
   * */
  setTimeout (mil) {
    this.timeout = mil
  },

  /**
   * 对应sql的insert
   * */
  insert (table, data) {
    const isMult = data instanceof Array
    if (!isMult) {
      data = [data]
    }
    // insert into `coords` (`x`, `y`) values (20, DEFAULT), (DEFAULT, 30), (10, 20)

    const values = []

    let fields = data.map((item) => {
      return Object.keys(item)
    })

    // 拉平+去重
    fields = Array.from(new Set(_.flatten(fields)))

    // values.push(...fields)

    const dataArr = []
    data.forEach((item) => {
      dataArr.push(fields.map((field) => {
        if (item[field] === undefined || item[field] === null) {
          return 'DEFAULT'
        } else {
          values.push(item[field])
          return '?'
        }
      }))
    })

    const sql = `INSERT INTO \`${table}\` (\`${fields.join('`,`')}\`) VALUES (${dataArr.join('),(')})`
    return this.return(sql, values)
  },

  /**
   * 对应sql的 DELETE FROM
   * */
  delete (table, where, limit = 1, allowEmpty = false) {
    const [whereSqls, vals2] = this.whereMain(where)
    if (!(whereSqls || allowEmpty)) {
      return this.return('', [])
    }
    limit = ['number', 'string'].includes(typeof limit) ? +limit : 1
    const sql = `DELETE FROM \`${table}\`${whereSqls ? (' WHERE ' + whereSqls) : ''}${limit ? ` LIMIT ${limit}` : ''}`
    return this.return(sql, vals2)
  },

  /**
   * 生成update语句
   * */
  update (table, where, data, limit = 1, allowEmpty = false) {
    const [colsSqls, vals1] = this.whereMain(data, 'update')
    if (!colsSqls) {
      return this.return('', [])
    }
    const [whereSqls, vals2] = this.whereMain(where)
    if (!(whereSqls.length || allowEmpty)) {
      return this.return('', [])
    }
    limit = ['number', 'string'].includes(typeof limit) ? +limit : 1
    const sql = `update \`${table}\` set ${colsSqls}${whereSqls ? (' where ' + whereSqls) : ''}${limit ? ` LIMIT ${limit}` : ''}`
    return this.return(sql, [...vals1, ...vals2])
  },

  // 生成select语句
  select (table, where, col, order, limit, offset, groupBy) {
    const orderArr = []

    const limitStr = ['number', 'string'].includes(typeof limit) ? +limit : 0
    const offsetStr = +offset
    if (order) {
      for (const [k, v] of Object.entries(order)) {
        if (typeof v === 'string') {
          if (v === 'desc' || v === 'DESC') {
            orderArr.push('`' + k + '`' + ` desc`)
          } else if (v === 'asc' || v === 'ASC') {
            orderArr.push('`' + k + '`' + ` asc`)
          } else if (/^\w+\(.+\)$/.test(v)) {
            orderArr.push(v)
          }
        } else if (v === -1) {
          orderArr.push('`' + k + '`' + ` desc`)
        } else {
          orderArr.push('`' + k + '`' + ` asc`)
        }
      }
    }

    // 选择的列
    let colsStr = ''
    if (typeof col === 'string') {
      colsStr = col
    } else if (col instanceof Array) {
      colsStr = col.join(',')
    } else {
      const cols = []
      for (let i in col) {
        cols.push('`' + i + '`')
      }
      colsStr = cols.join(',')
    }

    const [whereStr, vals] = this.whereMain(where)

    const sql = `SELECT ${colsStr || '*'} FROM \`${table}\`` +
      (whereStr ? ' WHERE ' + whereStr : '') +
      (groupBy ? ' GROUP BY ' + groupBy : '') + // 必须先 group by，否则会报sql错误
      (orderArr.length ? ' ORDER BY ' + orderArr.join(',') : '') +
      (limitStr ? (' LIMIT ' + limitStr) : '') +
      (offsetStr ? (' OFFSET ' + offsetStr) : '')
    return this.return(sql, vals)
  },

  // 生成where语句,可接收的数据格式更多,对象里还能用AND和OR
  whereMain (where, type) {
    if (typeof where === 'string') {
      return [where, []]
    }

    // 直接传 where里的sql语句和对应的值进来
    if (where instanceof Array) {
      return where
    }
    if (type === 'update') {
      const [whereSqls, vals] = this.whereBase(where, true)
      return [whereSqls.join(','), vals]
    }
    return this.breakWhere(where)
  },

  // 分解where对象，让whereMain支持and和or
  breakWhere (where, andOr = 'and') {
    andOr = andOr.toUpperCase()
    const sqls = []
    const vals = []
    for (const [k, v] of Object.entries(where)) {
      const ks = k.split('#')
      const key = trim(ks[0])
      if (['or', 'OR', 'and', 'AND'].includes(key)) {
        const [ss, vs] = this.breakWhere(v, key)
        sqls.push(`(${ss})`)
        vals.push(...vs)
      } else if (key === 'function') {
        sqls.push(v)
      } else {
        const objAndOr = trim(ks[1] || 'AND').toUpperCase()
        const [ss, vs] = this.whereOne(key, '=', v, false, ['AND', 'OR'].includes(objAndOr) ? objAndOr : 'AND')
        sqls.push(...ss)
        vals.push(...vs)
      }
    }
    return [sqls.join(` ${andOr} `), vals]
  },

  /**
   * 仅仅生成where中的语句，可选是select中的，还是update中的
   * 返回方式跟上面的不一样
   * @param o 对象形式的参数
   * @param isUpdate 类型，只能传 'update' ，表示这里生成的语句是用于 update 的 set 里
   * */
  whereBase (o, isUpdate) {
    const sqls = []
    const vals = []
    Object.entries(o).forEach(([k, v]) => {
      k = trim(k.split('#')[0])
      if (k === 'function') { // 是函数
        sqls.push(v)
        return
      }
      switch (typeof v) {
        case 'string':
        case 'number':
          sqls.push(`\`${k}\` = ?`)
          vals.push(v)
          break
        case 'boolean':
          sqls.push(`\`${k}\` = ?`)
          vals.push(v ? 1 : 0)
          break
        case 'object': {
          if (isUpdate) {
            if (v) {
              const symb = ['+', '-', '*', '/']
              for (const [kk, vv] of Object.entries(v)) {
                if (symb.includes(kk)) {
                  sqls.push(`${k} = ${k} ${kk} ?`)
                  vals.push(vv)
                }
              }
            } else {
              sqls.push(`\`${k}\` = null`)
            }
            break
          }
          if (!v) {
            // NOTICE: 不能严格等于
            sqls.push(`\`${k}\` is NULL`)
            break
          }
          if (v instanceof Date) {
            logger.error(`不支持Date类型：`, JSON.stringify({ [k]: v }))
            break
          }
          if (v instanceof Array) {
            sqls.push(`\`${k}\` in (${new Array(v.length).fill('?')})`)
            vals.push(...v)
            break
          }
          if (v instanceof RegExp) {
            sqls.push(`\`${k}\` like ?`)
            vals.push(v.toString().replaceAll('/g', '').replaceAll('/', ''))
            break
          }

          // value是对象，如： {'!=':'','not':[1,2,3]}
          Object.entries(v).forEach(([kk, vv]) => {
            kk = trim(kk.split('#')[0])
            if (['string', 'number'].includes(typeof vv)) {
              sqls.push(`\`${k}\` ${kk === '!' ? '!=' : kk} ?`)
              vals.push(vv)
            } else if (vv instanceof Array) {
              kk = kk.toUpperCase()
              let operator = 'NOT IN'
              if (!['!', '!=', 'NOT', 'NOT IN'].includes(kk)) {
                operator = 'IN'
              }
              sqls.push(`\`${k}\` ${operator} (${new Array(vv.length).fill('?')})`)
              vals.push(...vv)
            } else {
              logger.error(`不支持这种传值方式：`, JSON.stringify({ [k]: {
                [kk]: vv
              } }))
            }
          })
          break
        }
        case 'undefined':
          if (isUpdate) {
            sqls.push(`\`${k}\` = NULL`)
          } else {
            sqls.push(`\`${k}\` is NULL`)
          }
          break
        default:
          logger.error(`不支持这种传值方式：`, JSON.stringify({ [k]: v }))
      }
    })
    return [sqls, vals]
  },

  whereOne (key, operator, value, isUpdate, andOr = 'AND') {
    const sqls = []
    const vals = []
    operator = operator === '!' ? '!=' : operator
    switch (typeof value) {
      case 'string':
      case 'number':
        sqls.push(`\`${key}\` ${operator} ?`)
        vals.push(value)
        break
      case 'boolean':
        sqls.push(`\`${key}\` ${operator} ?`)
        vals.push(value ? 1 : 0)
        break
      case 'object': {
        if (isUpdate) {
          if (value) {
            const symb = ['+', '-', '*', '/']
            for (const [kk, vv] of Object.entries(value)) {
              if (symb.includes(kk)) {
                sqls.push(`${key} = ${key} ${kk} ?`)
                vals.push(vv)
              }
            }
          } else {
            sqls.push(`\`${key}\` = null`)
          }
          break
        }
        if (!value) {
          // NOTICE: 不能严格等于
          let op = 'IS'
          if (['!', '!=', 'NOT', 'IS NOT'].includes(operator)) {
            op = 'IS NOT'
          }
          sqls.push(`\`${key}\` ${op} NULL`)
          break
        }
        if (value instanceof Date) {
          logger.error(`不支持Date类型：`, JSON.stringify({ [key]: value }))
          break
        }
        if (value instanceof Array) {
          let op = 'NOT IN'
          if (!['!', '!=', 'NOT', 'NOT IN'].includes(operator)) {
            op = 'IN'
          }

          sqls.push(`\`${key}\` ${op} (${new Array(value.length).fill('?')})`)
          vals.push(...value)
          break
        }
        if (value instanceof RegExp) {
          sqls.push(`\`${key}\` like ?`)
          vals.push(value.toString().replace(/^\/([\w\W]*)\/\w*$/, '$1'))
          break
        }

        const objSqls = []
        // value是对象，如： {'!=':'','not':[1,2,3]}
        // const _pre2 = (/[0-9a-zA-Z_,]+\(.+\)/g).test(key) ? '' : '`' // 是函数的话就不用 ` 号
        Object.entries(value).forEach(([kk, vv]) => {
          kk = trim(kk.split('#')[0])
          const [ss, vs] = this.whereOne(key, kk, vv)
          objSqls.push(...ss)
          vals.push(...vs)
        })
        const s = objSqls.join(` ${andOr} `)
        sqls.push(objSqls.length > 1 ? `(${s})` : s)
        break
      }
      case 'undefined':
        if (isUpdate) {
          sqls.push(`\`${key}\` = NULL`)
        } else {
          let op = 'IS'
          if (['!', '!=', 'NOT', 'IS NOT'].includes(operator)) {
            op = 'IS NOT'
          }
          sqls.push(`\`${key}\` ${op} NULL`)
        }
        break
      default:
        logger.error(`不支持这种传值方式：`, JSON.stringify({ [key]: value }))
    }
    return [sqls, vals]
  },

  return (sql, values) {
    const data = {
      sql,
      values
    }
    if (this.timeout) {
      data.timeout = this.timeout
    }
    return data
  }
}
