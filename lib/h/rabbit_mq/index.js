/**
 * 含连接 MQ 的功能
 *
 * 配置说明：
 *
 * rabbitMQ: {
    // channel池的配置
    pool: {
      num: 5 // 有多少个channel，目前不能配置min和max，只能固定有这么多个
    },
    protocol: 'amqp',
    host: 'localhost',
    port: '5672'
    login: '', // 账号，如空，需要设置为undefined
    password: '', // 密码，如空，需要设置为undefined
    vhost: '' // vhost，如空，需要设置为undefined或空字符串
  }
 * */

const amqp = require('amqplib')
const logger = new (require('../../log'))('hRabbitMQ')

const conf = require('../../../config')

const mqs = {}

const connect = async function (conf) {
  try {
    const MQ = await amqp.connect({
      protocol: conf.protocol,
      hostname: conf.host,
      port: conf.port,
      username: conf.login,
      password: conf.password,
      locale: 'en_US',
      frameMax: 0,
      heartbeat: 0,
      vhost: conf.vhost
    })

    MQ.on('error', function (e) {
      logger.error(`[${conf.host}:${conf.port}] disconnect...`)
      logger.error(e.stack)
    })

    logger.log(`[${conf.host}:${conf.port}] connect succeed`)

    return MQ
  } catch (e) {
    logger.error(`[${conf.host} : ${conf.port}] connect fail`)
    logger.error(e.stack)
  }
  return false
}

class HRabbitMQ {
  constructor (config) {
    this.config = config

    this.config.pool = this.config.pool || {}
    this.config.pool.num = this.config.pool.num || 5

    this.mq = undefined

    // mq的状态是否成功连接，-1正在连接，0未连接，1连接成功，2连接失败
    this.mqStatus = 0

    this.lastReturnChannelIndex = -1
    this.channels = []
  }

  async connect () {
    if (this.mqStatus === -1) {
      return this.waitForConnected()
    }
    this.mqStatus = -1
    this.mq = await connect(this.config)
    if (this.mq) {
      this.mqStatus = 1
    } else {
      this.mqStatus = 2
    }

    return this
  }

  async waitForConnected () {
    switch (this.mqStatus) {
      case 1:
        return true
      case 2:
        return false
      case 0:
        const t = this
        return new Promise(resolve => {
          let time = 0
          function fn () {
            setTimeout(_ => {
              if (t.mqStatus === 1) {
                resolve(true)
              } else if (time >= 5000 || t.mqStatus === 2) {
                logger.error('等待MQ连接超时！')
                resolve(false)
              } else {
                if (t.mqStatus === 0) {
                  t.connect().then()
                }
                fn()
              }
            }, 10)
          }
          fn()
        })
    }
  }

  /**
   * channel 是可以缓存的，下次可以继续用，而且缓存到传入的mq对象中，所以不同实例中
   * */
  async getChannel () {
    await this.waitForConnected()
    this.lastReturnChannelIndex++
    this.lastReturnChannelIndex %= this.config.pool.num
    if (!this.channels[this.lastReturnChannelIndex]) {
      await this._createChannel(this.lastReturnChannelIndex)
    }
    return this.channels[this.lastReturnChannelIndex]
  }

  /**
   * 创建channel并加入缓存
   *
   * @param key 指定一个key，channel会加入到这个key的缓存里
   * */
  async _createChannel (key) {
    const channel = await this.mq.createChannel()
    // A channel will emit 'close' once the closing handshake (possibly initiated by #close()) has completed; or, if its connection closes.
    // When a channel closes, any unresolved operations on the channel will be abandoned (and the returned promises rejected).
    // channel.on('close', async () => {
    //   await this._createChannel(key)
    // })

    // A channel will emit 'error' if the server closes the channel for any reason. Such reasons include
    // an operation failed due to a failed precondition (usually something named in an argument not existing)
    // an human closed the channel with an admin tool
    // A channel will not emit 'error' if its connection closes with an error.
    channel.on('error', async (e) => {
      logger.error(`channel报错：`, e.stack)

      // 既然报错后会关闭channel，那就放在这里重新启动channel吧
      await this._createChannel(key)
    })

    // If a message is published with the mandatory flag (it’s an option to Channel#publish in this API), it may be returned to the sending channel if it cannot be routed. Whenever this happens, the channel will emit return with a message object (as described in #consume) as an argument.
    // channel.on('return', async (msg) => {})

    // 如果它的 publish 或 sendToQueue 返回了false，则在清空其写缓冲区后，会发出该事件
    // channel.on('drain', async () => {})

    this.channels[key] = channel

    return this
  }

  /**
   * 把信息发送到指定的队列
   * 不论data是不是字符串，这里都会JSON.stringify
   * */
  async sendToQueue (queueName, data, options) {
    let res
    try {
      const ch = await this.getChannel()
      await ch.assertQueue(queueName, {}) // 这一句，不知道要不要缓存
      res = await ch.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), options)
    } catch (e) {
      logger.error('队列报错：', e.stack)
    }
    return res
  }

  /**
   * 把信息发布出去
   * 不论data是不是字符串，这里都会JSON.stringify
   * */
  async publish (exchangeName, routingKey, data, options, exchangeOpt = { durable: true }) {
    let res
    try {
      const ch = await this.getChannel()
      await ch.assertExchange(exchangeName, 'direct', exchangeOpt) // 这一句，不知道要不要缓存
      res = await ch.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(data)), options)
    } catch (e) {
      logger.error('队列报错：', e.stack)
    }
    return res
  }

  /**
   * 连接mq
   * @param key string|object 传入配置文件中的key，或者新的配置
   * @param onConnectSucc function 这里会异步返回连接结果 传入配置文件中的key，或者新的配置
   * @return HRabbitMQ
   * */
  static getMQ (key, onConnectSucc) {
    const config = (key && typeof key === 'object') ? key : undefined
    key = config ? JSON.stringify(config) : (key || 'rabbitMQ')
    if (!mqs[key]) {
      mqs[key] = new HRabbitMQ(config || conf[key])
      if (onConnectSucc) {
        mqs[key].connect().then(async () => {
          await onConnectSucc()
        })
      }
    }
    return mqs[key]
  }
}

module.exports = HRabbitMQ
