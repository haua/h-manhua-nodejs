'use strict'

/** @type Egg.EggPlugin */
module.exports = {
  sequelize: {
    enable: true,
    package: 'egg-sequelize'
  },

  redis: {
    enable: true,
    package: 'egg-redis'
  }

  // had enabled by egg
  // static: {
  //   enable: true,
  // }
}
