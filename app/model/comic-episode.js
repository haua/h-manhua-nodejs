'use strict'

const tabelName = 'comic_episode'

const { dateGetterMethods } = require('../../lib/sequelize')

// 需要自动格式化的日期字段
const dateFields = ['createdAt', 'updatedAt']

const getterMethods = dateGetterMethods(dateFields)

module.exports = app => {
  const { STRING, BIGINT, TINYINT } = app.Sequelize

  const model = app.model.define(tabelName, {
    id: { type: BIGINT, primaryKey: true, autoIncrement: true },
    sid: STRING(32),
    comicId: BIGINT,
    channelId: BIGINT,
    title: STRING(255),
    dFlag: TINYINT
  }, {
    getterMethods
  })

  // 设置一对多关系
  model.associate = function () {
    app.model.ComicEpisode.belongsTo(app.model.ComicChannel, {
      foreignKey: 'channelId', // 本表对应的字段
      targetKey: 'id'
    })

    // 漫画图片表
    app.model.ComicEpisode.hasMany(app.model.ComicImg, {
      as: 'imgs',
      foreignKey: 'episodeId',
      targetKey: 'id'
    })
  }

  return model
}
