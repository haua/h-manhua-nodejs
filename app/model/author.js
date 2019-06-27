'use strict'

const { dateGetterMethods } = require('../../lib/sequelize')

// 需要自动格式化的日期字段
const dateFields = ['createdAt', 'updatedAt']

const getterMethods = dateGetterMethods(dateFields)

module.exports = app => {
  const { STRING, BIGINT, TINYINT } = app.Sequelize

  const model = app.model.define('author', {
    id: { type: BIGINT, primaryKey: true, autoIncrement: true },
    sid: STRING(32),
    name: STRING(255),
    dFlag: TINYINT
    // 不要定义下面这俩，否则会出现重复字段，因为 sequelize 非要自己加。
    // created_at: DATE,
    // updated_at: DATE
  }, {
    getterMethods
  })

  // 设置一对多关系
  model.associate = function () {
    app.model.Author.hasMany(app.model.Comic, {
      foreignKey: 'authorId',
      targetKey: 'id'
    })
  }

  return model
}
