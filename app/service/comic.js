const { Service } = require('egg')

const hTools = require('../../lib/h/tools')

module.exports = class extends Service {
  async page (where, page, pageSize, needTotal) {
    const { model } = this.app

    page = page && page > 1 ? page : 1
    pageSize = pageSize && pageSize > 0 ? (Math.min(1000, pageSize)) : 10

    const rows = await model.Comic.findAll({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      // 关联查询
      include: {
        model: model.Author
      }
    }) || []

    let count = -1
    if (needTotal) {
      count = await model.Comic.count({
        where
      }) || 0
    }

    // const list = await this.packAuthors(rows)

    return [200, 'ok', {
      total: count,
      list: rows
    }]
  }

  // 用了seq自带的表关联，就不用这个函数了
  async packAuthors (data) {
    if (!data) return data
    const isArr = data instanceof Array
    if (!isArr) data = [data]

    const { app: { model } } = this

    const authorIDs = [...new Set(data.map(d => d.authorId))]
    let authorMap = {}
    if (authorIDs.length) {
      const authors = await model.Author.findAll({
        where: {
          id: authorIDs
        },
        attributes: ['id', 'sid', 'name']
      })
      authorMap = hTools.arrayToMap(authors, 'id')
    }

    data.forEach(d => {
      d.author = authorMap[d.authorId]
    })

    return isArr ? data : data[0]
  }

  async getBySid (sid) {
    const { model } = this.app

    const comic = await model.Comic.findOne({
      attributes: ['sid', 'authorId', 'title', 'cover', 'coverBg', 'desc', 'tags', 'state', 'statePublish', 'publicTime', 'updateTime'],
      where: {
        sid
      },
      // 关联查询
      include: [
        {
          model: model.Author,
          attributes: ['sid', 'name']
        },
        {
          as: 'comicChannels',
          model: model.ComicChannel,
          attributes: ['id', 'sid', 'name']
        }
      ]
    })

    if (comic && comic.comicChannels && comic.comicChannels[0]) {
      comic.comicChannels[0].episodes = await this.getEpisodes(comic.comicChannels[0].id, ['createdAt', 'sid', 'title'])
    }

    return comic
  }

  // 获取指定channel的所有话
  async getEpisodes (channelID, col) {
    const { model } = this.app
    return model.ComicEpisode.findAll({
      attributes: col,
      where: {
        channelId: channelID
      }
    })
  }

  // 获取指定channel的所有话
  async getEpisodeDetailBySid (sid) {
    const { model } = this.app

    return model.ComicEpisode.findOne({
      attributes: ['sid', 'title', 'createdAt'],
      include: {
        as: 'imgs',
        attributes: ['src'],
        model: model.ComicImg
      },
      where: {
        sid
      }
    })
  }
}
