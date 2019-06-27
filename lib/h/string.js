module.exports = {
  len (str) {
    let cArr = str.match(/[^\x00-\xff]/ig)
    return str.length + (cArr == null ? 0 : cArr.length)
  },

  /**
   * 解析 JSON
   * @param string
   * @param bigIntToStr 是否处理bigInt
   * */
  jsonDecode (string, { bigIntToStr = false } = {}) {
    try {
      if (bigIntToStr) {
        string = string.replace(/([{[,\n\s]"[^"]*"[\n\s]*:[\n\s]*)(\d{15,})/g, `$1"$2"`)
      }
      return JSON.parse(string)
    } catch (e) {
      return false
    }
  },

  /**
   * 转为 JSON
   * */
  jsonEncode (obj) {
    return JSON.stringify(obj)
  },

  // todo 计算字符串中包含某字符串的次数
  count (str, pattern) {
    let time = 0
    let nowMatch = 0
    for (const s of str) {
      let i = 0
      for (const p of pattern) {
        if (s === p) {
          nowMatch = true
        } else {
          nowMatch = 0
        }
        i++
        break
      }
    }
    return time
  },

  // 脱敏手机号
  unMobile (mobile) {
    return mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }
}
