'use strict'

const { Controller } = require('egg')

class ComicController extends Controller {
  // 分页查询
  async page () {
    const { ctx, ctx: { request, service } } = this
    const { page, pageSize, needTotal } = request.query

    const res = await service.comic.page({}, page, pageSize, needTotal)

    if (res[2]) {
      res[2].list = res[2].list.map(d => {
        return {
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          sid: d.sid,
          title: d.title,
          cover: d.cover,
          coverBg: d.coverBg,
          desc: d.desc || '',
          tags: d.tags,
          state: d.state,
          statePublish: d.statePublish,
          publicTime: d.publicTime,
          updateTime: d.updateTime,
          author: d.author && {
            sid: d.author.sid,
            name: d.author.name
          }
        }
      })
    }

    ctx.jsonBody(res)
  }

  async getBySid () {
    const { ctx, ctx: { request, service } } = this
    const { sid } = request.query

    const comic = await service.comic.getBySid(sid)

    ctx.jsonBody(comic ? [200, '', comic] : [404, '漫画不存在'])
  }

  async getEpisodeDetailBySid () {
    const { ctx, ctx: { request, service } } = this
    const { sid } = request.query

    const comic = await service.comic.getEpisodeDetailBySid(sid)

    ctx.jsonBody(comic ? [200, '', comic] : [404, '本话不存在'])
  }
}

module.exports = ComicController
