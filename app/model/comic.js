'use strict'

const { dateGetterMethods, customGetterSetter } = require('../../lib/sequelize')

// 需要自动格式化的日期字段
const dateFields = ['createdAt', 'updatedAt', 'public_time', 'update_time']

// 这些字段不会出现在数据表里，但是有可能在业务代码中给这个model添加的字段。
// 比如查询一篇文章，作者信息存在另一个表，就需要将作者信息查出来后，设置到文章model中
const customFields = ['author']

module.exports = app => {
  const { STRING, TEXT, BIGINT, DATE, TINYINT } = app.Sequelize

  // 这里的代码是启动的时候跑的，不会在每次请求来的时候跑。
  const { getterMethods, setterMethods } = customGetterSetter(customFields)
  const dateGetters = dateGetterMethods(dateFields)
  Object.assign(getterMethods, dateGetters)

  const model = app.model.define('comic', {
    id: { type: BIGINT, primaryKey: true, autoIncrement: true },
    sid: STRING(32),
    title: STRING(255),
    cover: STRING(255),
    coverBg: STRING(255),
    authorId: BIGINT,
    desc: TEXT,
    tags: STRING(255),
    state: TINYINT,
    statePublish: TINYINT,
    publicTime: DATE,
    updateTime: DATE,
    dFlag: TINYINT
    // 不要定义下面这俩，否则会出现重复字段，因为 sequelize 非要自己加。
    // created_at: DATE,
    // updated_at: DATE
  }, {
    getterMethods,
    setterMethods
  })

  // bug Sequelize 一个表同时有belongsTo关系及hasMany关系时，一对一关系中的 foreignKey 一定要出现在 attributes 中，否则会报错，应该是 Sequelize 的 bug
  // 设置一对多关系
  model.associate = function () {
    // 作者表
    app.model.Comic.belongsTo(app.model.Author, {
      foreignKey: 'authorId', // 本表对应的字段
      targetKey: 'id'
    })

    // 漫画正篇
    app.model.Comic.hasMany(app.model.ComicChannel, {
      as: 'comicChannels',
      foreignKey: 'comicId',
      targetKey: 'id'
    })
  }

  return model
}
