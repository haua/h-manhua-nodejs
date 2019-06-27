const moment = require('moment')

module.exports = {
  // 生成日期函数
  dateGetterMethods (fields) {
    return fields.reduce((obj, field) => ({
      ...obj,
      [field]: function () {
        const time = this.getDataValue(field)
        return time ? moment(time).format('YYYY-MM-DD HH:mm:ss') : null
      }
    }), {})
  },

  /**
   * 生成自定义字段的getter和setter
   * 这些自定义字段不会出现在数据表里，但是有可能在业务代码中给这个model添加的字段。
   * 比如一对一、一对多、多对多关系的数据
   * 一对多关系，如果直接使用sequelize支持的关系，虽然简单多了，但是它是使用 LEFT OUTER JOIN 等方法，有可能性能低，
   * 如果想自己写查询对应关系的方法，就需要用到这个函数，给model添加getter和setter方法，就可以把自己查出来的数据设置到想要的model里
   * 如：
   *
   * const data1 = await model.Model1.findAll() // 假设 Model1 已经使用该方法生成的getter和setter函数了
   * const data2 = await model.Model2.findAll()
   * data1.data2 = data2
   *
   * 这样操作 data1 之后，data1 的用法跟用sequelize自带的关系查询出来的model实例一模一样
   * */
  customGetterSetter (fields) {
    return {
      getterMethods: fields.reduce((obj, field) => ({
        ...obj,
        [field]: function () {
          return this.getDataValue(field)
        }
      }), {}),

      setterMethods: fields.reduce((obj, field) => ({
        ...obj,
        [field]: function (value) {
          this.setDataValue(field, value)
        }
      }), {})
    }
  }
}
