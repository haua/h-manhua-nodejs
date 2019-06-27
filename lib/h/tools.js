// 小工具

module.exports = {
  // async 版 setTimeout
  async setTimeout (ms) {
    return new Promise(function (resolve, reject) {
      global.setTimeout(() => resolve(), ms)
    })
  },

  /**
   * 返回最小值和最大值之间的随机数
   * @param min 最小值，整形，含
   * @param max 最大值，整形，也含
   * @return number 整形
   * */
  rand (min, max) {
    return parseInt(Math.random() * (max + 1 - min)) + min
  },

  // 去掉字符串前后空格
  trim (str) {
    return str && str.replace ? str.replace(/^\s+|\s+$/, '') : str
  },

  /**
   * 把对象数组里，每个子项的某个key的value取出来当key
   * */
  arrayToMap (array, key, delKey) {
    const map = {}
    array.some((item) => {
      map[item[key]] = item
      if (delKey) {
        delete item[key]
      }
    })
    return map
  },

  /**
   * 把一个对象内所有下横线key都改为驼峰
   *
   * @param map obj|array
   * @param level 转换多少层
   * */
  mapKeyToCamel (map, level = 10) {
    if (!map || level <= 0) {
      return map
    }
    if (map instanceof Array) {
      return map.map(v => this.mapKeyToCamel(v, level - 1))
    }
    // 从数据库查出来的是 RowDataPacket 对象，并不是普通对象，所以不能这样判断
    if (typeof map !== 'object') {
      return map
    }
    const newMap = {}
    Object.entries(map).forEach(([k, v]) => {
      newMap[this.strToCamel(k)] =
        typeof v === 'object'
          ? this.mapKeyToCamel(v, level - 1)
          : v
    })
    return newMap
  },

  /**
   * 把字符串转为驼峰方式
   * 如果出现 _2 或者 _A 这些情况，只会把下横线去掉
   * 如果下横线开头，则首字母也会大写
   * */
  strToCamel (str) {
    return str.replace(/_([a-zA-Z0-9])/g, (_, p1) => p1.toUpperCase())
  },

  // 筛选对象
  objectFilter (obj, keys) {
    const newObj = {}
    keys.forEach(k => { (obj[k] !== undefined) && (newObj[k] = obj[k]) })
    obj = null
    return newObj
  }
}
