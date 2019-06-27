'use strict'

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app
  router.get('/', controller.home.index)

  // 漫画
  router.get('/comic/page', controller.comic.page)
  router.get('/comic/sid', controller.comic.getBySid)
  router.get('/comic/episode', controller.comic.getEpisodeDetailBySid)
}
