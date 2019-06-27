(function () {
  const oldDateParse = Date.parse
  Date.parse = function (str) {
    let time = oldDateParse ? oldDateParse(str) : false // ios不兼容某种字符串的格式
    if (!time || isNaN(time)) {
      let dates = str.split(/\s|-|:\./)
      if (dates.join('').search(/^[0-9]+$/) < 0) { return Number.NaN }

      for (let i = 0; i < 7; i++) {
        dates[i] = dates[i] || (i === 1 ? 1 : 0)
      }

      time = (new Date(dates[0], dates[1] - 1, dates[2], dates[3], dates[4], dates[5], dates[6])).getTime()
    }
    return time
  }
}())
