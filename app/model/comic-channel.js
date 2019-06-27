'use strict'

const tabelName = 'comic_channel'

const { dateGetterMethods, customGetterSetter } = require('../../lib/sequelize')

// 需要自动格式化的日期字段
const dateFields = ['createdAt', 'updatedAt']

// 这些字段不会出现在数据表里，但是有可能在业务代码中给这个model添加的字段。
// 比如查询一篇文章，作者信息存在另一个表，就需要将作者信息查出来后，设置到文章model中
const customFields = ['episodes']

module.exports = app => {
  const { STRING, BIGINT, TINYINT } = app.Sequelize

  // 这里的代码是启动的时候跑的，不会在每次请求来的时候跑。
  const { getterMethods, setterMethods } = customGetterSetter(customFields)
  const dateGetters = dateGetterMethods(dateFields)
  Object.assign(getterMethods, dateGetters)

  const model = app.model.define(tabelName, {
    id: { type: BIGINT, primaryKey: true, autoIncrement: true },
    sid: STRING(32),
    comicId: BIGINT,
    name: STRING(255),
    dFlag: TINYINT
  }, {
    getterMethods,
    setterMethods
  })

  // 设置一对多关系
  model.associate = function () {
    app.model.ComicChannel.belongsTo(app.model.Comic, {
      foreignKey: 'comicId', // 本表对应的字段
      targetKey: 'id'
    })

    // 漫画正篇
    app.model.ComicChannel.hasMany(app.model.ComicEpisode, {
      as: 'comicEpisodes',
      foreignKey: 'channelId',
      targetKey: 'id'
    })
  }

  return model
}
