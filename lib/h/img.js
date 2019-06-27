/**
 * 处理图片相关的
 * */
const url = require('url')
const http = require('http')
const req = require('request')

let sizeOf
try {
  sizeOf = require('image-size')
} catch (e) {}

module.exports = {
  /**
   * 获取图片宽高，支持网络图片
   * 如果是判断网络图片，需要一些网络资源，放心，这个方法不会把整个图片都下载回来
   * @return object|boolean 成功会返回这样的对象：{ height: 594, width: 1080, type: 'jpg' }，失败返回false
   * */
  async sizeOf (dir) {
    if (!sizeOf) {
      console.error('未安装image-size，获取图片宽高的功能将不可用')
      return
    }

    try {
      const isUrl = /^https?:\/\//.test(dir)

      if (isUrl) {
        return await new Promise((resolve, reject) => {
          const ur = url.parse(dir)
          const chunks = []
          req({ uri: ur })
            .on('data', (chunk) => {
              chunks.push(chunk)
            })
            .on('end', () => {
              resolve(this.checkSizeOfBuffer(Buffer.concat(chunks)))
            })
            .on('error', (err) => {
              reject(err)
            })
        })
      } else {
        throw new Error('暂不支持本地图片')
      }
    } catch (e) {
      console.error('sizeOf图片尺寸报错：', e.stack)
      return false
    }
  },

  checkSizeOfBuffer (buffer) {
    try {
      return sizeOf(buffer)
    } catch (e) {
      console.error('[checkSizeOfBuffer] 检查sizeOf失败：', e.stack)
      return false
    }
  }
}
