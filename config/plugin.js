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
  },

  // alinode: {
  //   enable: true,
  //   package: 'egg-alinode'
  // }

  // had enabled by egg
  // static: {
  //   enable: true,
  // }
}
