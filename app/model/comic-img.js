'use strict'

const tabelName = 'comic_img'

const { dateGetterMethods } = require('../../lib/sequelize')

// 需要自动格式化的日期字段
const dateFields = ['createdAt', 'updatedAt']

const getterMethods = dateGetterMethods(dateFields)

module.exports = app => {
  const { STRING, BIGINT, INTEGER, TINYINT } = app.Sequelize

  const model = app.model.define(tabelName, {
    id: { type: BIGINT, primaryKey: true, autoIncrement: true },
    sid: STRING(32),
    comicId: BIGINT,
    episodeId: BIGINT,
    src: STRING(255),
    width: INTEGER,
    height: INTEGER,
    dFlag: TINYINT
  }, {
    getterMethods
  })

  // 设置一对多关系
  model.associate = function () {
    app.model.ComicImg.belongsTo(app.model.ComicEpisode, {
      foreignKey: 'episodeId', // 本表对应的字段
      targetKey: 'id'
    })
  }

  return model
}
