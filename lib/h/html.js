
module.exports = {
  createTable (datas, titles) {
    return `<table border="1" cellspacing="0">${titles ? `<tr>${titles.map(c => `<th>${c}</th>`).join('')}</tr>` : ''}${datas.map(ceils => `<tr>${ceils.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`
  },

  // 生成 csv 格式的数据
  // \ufeff 是 bom 头。不加这个的话，office打开会乱码（wps不会）
  createCsv (datas) {
    return '\ufeff' + datas.map(d => d.join(',')).join('\n')
  }
}
