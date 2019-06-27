'use strict'

const config = {}

const setConfig = conf => {
  Object.assign(config, conf)
  if (conf.setConfig) {
    config.setConfig = setConfig
  }
}

config.setConfig = setConfig

module.exports = config
