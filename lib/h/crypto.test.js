
const assert = require('assert')

const $ = require('meeko')

const hCrypto = require('./crypto')

const bizs = [
  {
    sessionKey: '0v8hPvYZONO5XllnfKT7Tw==',
    encryptedData: 'OHI2I6jJcbWgL6UDsApBArc+5VhdLeIMwmnG5qgS7EAWXCTsArnMTNCb2FxnYTCBK5v3CYDvXAf8hfCrRBmC9UWWzNx6fETCr0xSfazYYfFEktUDaxFFpGhj/bpc391xVx3Tq+7Xi+wV5iP2yqiktLOpc0PA1VAS2Y4dZFpq7Y6/nKCErA1HKtBX9ayDhf09ZKBHdgHpcx5eh7QQ9mhtsBPHDoW9T65K3m/qlH9PHhjL6E+E0Bil2EHEo1kZS9djWyPmjYaoNl0npFoCGwIMeeaeSFanXWOv2ZwBLWy58eJnh84S5qlhGOuzUQGPlyKsUwzysf9e9DvyuSAp5eabSTqC18kCpdbxhc4aSCXzFJ+nF7eOzHwsONWoQFj/iBtwkYN2P9NzwYcABX/4pdMjA0P7zfGtYSxPEGSr7sHLgQm0/hxB5U0B7ggkkXYyG2o9JdWZZ78ksgWacyHq1SsM0kz8CH7dr90OU7QVNsjI4/MI9vs2A51LOd11ofX4v9sz57PXQUPQvJ6WUxoGabScuQ==',
    iv: 'u8CkaLElNrtYPdBO4qebPw=='
  }, {
    sessionKey: 'gdbvMdOg7aIPRU3vkFMW4w==',
    encryptedData: 'ITgOqab0YsYn5KFEH05dJsGUebn3eovLoIldHFmnIMCdv1DXNULzKlLWqvHrSuOCHSPNnf1+b4D0lwktMx6D/nQl+oa6CJRijTJRUfyFWNvjDYfqlhz9ONECOV18njnhat787nxLePDubac275rIEUp91sxiZ5S5kCYhhUAJWC2XS5SIJMvuSsHs6nenQGsKlcRaUPEbLbTVm+lXFatFYv+JUtdU/QDFVH48t3nY/K/X6Eap8RIIkSF24hsY14paDKWLldWE/FphxVhM4tyX0T/SnoAE6D6fXiczwDOlX+ktPXvRjwA2VsJowdDAu0pWWqhIFBbqJtVx2sWnohUNkn431pQzXl0tXupgeZT6/TWhUDDvjHQjyEYLpcDDui73wm6BsVfU52rsrWFQ0ZGcw3w8TRmNyPyWqIYXqS34mlQwpykd0wmIOLQIbKz9/8xY2tmPD9tmP00jV230qXEBsR9jM8yjU5PjMmy6BINC4ov5f/IirxfUZKAY93VHzqOsox13lnx5gUEcyHHlqnMeHQ==',
    iv: 'fSys7AriFDxVj/BwmUdKMw=="'
  }
]

const wxBiz = bizs[1]

describe('hCrypto', () => {
  it('wxBizDataCrypt', async function () {
    const res = hCrypto.wxBizDataCrypt(wxBiz.sessionKey, wxBiz.encryptedData, wxBiz.iv)

    console.log('解密结果：', res)

    assert.strictEqual(!!res, true)
  })
  it('md5', async function () {
    const res = hCrypto.md5($.tools.uuid(32))

    console.log('结果：', res)

    assert.strictEqual(!!res, true)
  })
})
