/**
 * 重写meeko的一些方法
 * */

const $ = require('meeko')

const tools = $.tools

/**
 * @param params 参数
 * @param options 每个参数的规则
 * */
tools.checkParam = function (params, options) {
  // console.log('rewrite_meeko', params)
  // NOTICE : 0的问题
  const c = {}
  let _n
  /**
   * 类型判断函数
   * 如果返回值转为bool为false，表示它是通过了检查
   * */
  const typeCheck = function (key, valA, opt, addToC) {
    addToC = !(addToC === false) // 默认为true
    const type = (opt.type || 'string').toLow()
    switch (type) {
      case 'int':
        if (!tools.isInt(valA + '')) {
          return {
            code: 401,
            msg: opt.name + '类型错误,应为整型'
          }
        }
        if (opt.length) {
          const min = opt.length[0] || opt.length.min
          const max = opt.length[1] || opt.length.max
          // 是允许值等于 min 和 max 的
          if (valA > max || valA < min) {
            return {
              code: 401,
              msg: opt.name + '不在可取值范围内'
            }
          }
        }
        addToC && (c[key] = +valA)
        break
      case 'positive':
        if (!tools.isInt(valA + '') || valA <= 0) {
          return {
            code: 401,
            msg: opt.name + '类型错误,应为正整数'
          }
        }
        addToC && (c[key] = +valA)
        break
      case 'negative':
        if (!tools.isInt(valA + '') || valA >= 0) {
          return {
            code: 401,
            msg: opt.name + '类型错误,应为负整数'
          }
        }
        addToC && (c[key] = +valA)
        break
      case 'string':
        valA = valA + ''
        if (opt.length) {
          const min = opt.length[0] || opt.length.min
          const max = opt.length[1] || opt.length.max
          const length = valA.len()
          // 是允许值等于 min 和 max 的
          if (length > max || length < min) {
            return {
              code: 401,
              msg: opt.name + '长度不正确'
            }
          }
        }
        if (opt.reg) {
          if (!(new RegExp(opt.reg).test(valA))) {
            return {
              code: 401,
              msg: opt.err || (opt.name + '格式有误')
            }
          }
        }
        addToC && (c[key] = valA)
        break
      case 'datetime':
        // TODO : ie 需要补一个 toISOString 函数
        _n = valA || opt.def
        if (!tools.isDate(_n + '')) {
          return {
            code: 401,
            msg: opt.name + '类型错误,应为日期型'
          }
        }
        addToC && (c[key] = _n)
        break
      case 'bool':
        if (!tools.isBool(valA)) {
          return {
            code: 401,
            msg: opt.name + '类型错误，,应为布尔型 '
          }
        }
        addToC && (c[key] = valA)
        break
      case 'number':
        if (!tools.isDecimal(valA + '')) {
          return {
            code: 401,
            msg: opt.name + '类型错误,应为数值型'
          }
        }
        if (opt.length) {
          const min = opt.length[0] || opt.length.min
          const max = opt.length[1] || opt.length.max
          // 是允许值等于 min 和 max 的
          if (valA > max || valA < min) {
            return {
              code: 401,
              msg: opt.name + '不在可取值范围内'
            }
          }
        }
        addToC && (c[key] = +valA)
        break
      case 'array': // 支持数组
        if (!(valA instanceof Array)) {
          return {
            code: 401,
            msg: opt.name + '类型错误,应为数组型'
          }
        }
        if (opt.length) {
          const min = opt.length[0] || opt.length.min
          const max = opt.length[1] || opt.length.max
          // 是允许值等于 min 和 max 的
          if (valA.length > max || valA.length < min) {
            return {
              code: 401,
              msg: opt.name + '长度不符合要求'
            }
          }
        }
        // 如果是数组，可以为它配置items的类型： arrayParam1:{type:'array',items:{type:'string'}}
        for (let j = 0; j < valA.length; j++) {
          const result = typeCheck(key, valA[j], opt.items || {}, false)
          if (result && result.code >= 400) {
            return result
          }
        }
        addToC && (c[key] = valA)
        break
      default:
        let res = {
          code: 500,
          msg: '参数类型定义错误'
        }
        // 放到这里是因为考虑到大部分接口都无需多个类型
        const types = type.split('|')
        if (types.length > 1) {
          types.some((type) => {
            res = typeCheck(key, valA, { ...opt, ...{ type: type } }, addToC)
            if (!res || res.code < 400) {
              return true
            }
          })

          if (res && res.code >= 400) {
            return {
              code: 500,
              msg: opt.name + '不正确'
            }
          }
        }
        return res
    }
  }

  for (const [i, opt] of Object.entries(options)) {
    opt.name = opt.name || i
    if (!params[i] && params[i] !== 0 && params[i] !== '') {
      // console.log(11111, i, params)
      if (opt.req === 1) {
        return {
          code: 401,
          msg: opt.reqErr || (opt.name + '必填')
        }
      } else if (opt.def !== null && opt.def !== undefined) {
        c[i] = opt.def
      }
      continue
    }
    let r = typeCheck(i, params[i], opt)
    if (r) return r
  }
  return {
    code: 200,
    msg: '',
    data: c
  }
}
