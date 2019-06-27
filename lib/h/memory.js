/**
 * 可以认为是全局变量管理的工具。
 * */

const variable = {

}

const locks = {}
const locksExpire = {}

// 清除过期的锁，理论上一个锁会自动重复使用的，不会有很多无用的锁，所以暂时无需执行
// let clearing = false
// const clearLocks = () => {
//   if (clearing) {
//     return
//   }
//   clearing = true
//   setTimeout(() => {
//     let now = Date.now()
//     Object.entries(locksExpire).forEach(([k, v]) => {
//       if (v <= now) {
//         if (locks[k]) delete locks[k]
//         delete locksExpire[k]
//       }
//     })
//     clearing = false
//   }, 5000)
// }

/**
 * 外部可以直接对这个对象操作。
 * */
module.exports = {
  /**
   * 内存锁，只有单机单实例，fork模式才是安全的锁，毕竟只有这样的内存才是共享的。
   * @param lockName string 锁的名字，自定义即可，亦支持 Symbol
   * @param expire int 多久后自动释放，单位毫秒，必需有值，默认5秒，防止死锁
   * @return boolean|Symbol 如果加锁失败，返回false，如果成功，返回一个key，用于主动解锁
   * */
  lock (lockName, expire = 5000) {
    const now = Date.now()
    if (locks[lockName] && !(locksExpire[lockName] && locksExpire[lockName] <= now)) {
      return false
    }
    locks[lockName] = Symbol(lockName)

    locksExpire[lockName] = now + (expire || 5000)

    return locks[lockName]
  },

  /**
   * 解锁
   * @param lockName string 锁的名字，自定义即可，亦支持 Symbol
   * @param lockKey Symbol lock方法返回的数据，要存起来然后在这个方法传进来
   * @return boolean 返回解锁成功还是失败，要name和key对应起来才能解锁成功。
   * */
  unlock (lockName, lockKey) {
    if (locks[lockName] === lockKey) {
      delete locks[lockName]
      delete locksExpire[lockName]
      return true
    }
    return false
  },

  get (key) {
    return variable[key]
  },

  set (key, value) {
    variable[key] = value
  }
}
