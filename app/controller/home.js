'use strict'

const { Controller } = require('egg')

class HomeController extends Controller {
  async index () {
    const { ctx } = this

    const data = await ctx.model.Comic.findAll()
    ctx.jsonBody(200, 'hi, egg', data)
  }
}

module.exports = HomeController
