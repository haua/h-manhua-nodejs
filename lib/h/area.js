/**
 * 从官方网站同步中国行政区划信息
 *
 * 大陆数据由此动态获得（其中金门县和连江县划分在福建省）
 * http://www.mca.gov.cn/article/sj/xzqh/2018/
 *
 * 台湾、香港、澳门似乎找不到官方的数据，只有去wiki找，并且写死在此代码里，只有大陆的数据
 *
 * 台湾的行政区划是根据wiki写死
 * https://zh.wikipedia.org/wiki/%E8%87%BA%E7%81%A3%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83#%E8%87%BA%E7%81%A3%E7%8F%BE%E8%A1%8C%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83
 *
 * 香港似乎有多种区域划分，这里选取香港各个区议会的划分
 * https://zh.wikipedia.org/wiki/%E9%A6%99%E6%B8%AF%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83#%E5%8D%80%E8%AD%B0%E6%9C%83
 * 如需查看相关的划分图，查看以上页面的第一张图即可
 *
 * 澳门可以找到很官方的行政区划：
 * https://zh.wikipedia.org/wiki/%E6%BE%B3%E9%96%80%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83#%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83%E5%88%86
 * 但是该wiki中提到澳门本地人并不习惯使用，看了京东和微信小程序内的地址选择器，觉得还是参考微信小程序的吧
 *
 * 5个不设市辖区的地级市的镇级数据是根据百度百科写死的
 *
 * 我国大陆区划级别
 *
 * 省级：省、自治区、直辖市
 * 地级：地级市、地区、自治州、盟
 * 县级：市辖区、县级市、县
 *
 * 特殊情况：
 * *. 可以没有地级：直辖市都没有市级，海南同时有市级，又有很多县级是省直辖，这样的省还有：河南、湖北
 *        这种数据如果是直辖市，则会以直辖市为名创建一个地市级，省直辖的县，也会建一个省份为名字的地级
 * *. 可以没有区/县级：中国5个不设市辖区的地级市一共是：东莞市、中山市、三沙市、儋州市、嘉峪关市
 *        现在把镇数据当作下一级数据
 * *. 重庆很特别，它下面两种直辖县级，一种称为县，一种称为区，关键是它们代码的中间两位是不一样的。其它直辖市没有这种情况
 *        现在重庆下面有个虚拟的地级：区、县
 * */
const requestPro = require('request-promise-native')
const cheerio = require('cheerio')
const hTools = require('./tools')

module.exports = {
  /**
   * 分析并生成省市表格
   * http://www.mca.gov.cn/article/sj/xzqh/2018/
   * 只能分析以上地址的数据，以上数据有两种，一种是全部的，一种是变更情况，只能分析全部的
   *
   * http://xzqh.mca.gov.cn/map
   * 看这里能知道具体行政划分
   *
   * 分析来的数据有的市下面如果没有区，则什么都没有
   * 区划代码说明：
   * 一共有6位
   * 前2位是省级代码
   * 中间2位市级代码
   * 后两位是县级代码
   * */
  async getAllDatas () {
    const dataUrl = 'http://www.mca.gov.cn/article/sj/xzqh/2018/201804-12/20181011221630.html'

    const { body } = await this.getDataLikeChrome(dataUrl)
    const $ = cheerio.load(body)
    const lines = []

    // console.log($('table tbody'))

    $('table tr').each((i, item) => {
      const line = []
      $(item).find('td').each((i, item) => {
        const text = hTools.trim($(item).text().replace())
        if (text) {
          line.push(text)
        }
      })
      if (line[1] && (/^[0-9]+$/).test(line[0])) {
        lines.push(line)
      }
    })

    const datas = [
      { id: 1, pid: 0, level: 0, sid: '', name: '亚洲(Asia)' },
      { id: 2, pid: 0, level: 0, sid: '', name: '欧洲(Europe)' },
      { id: 3, pid: 0, level: 0, sid: '', name: '北美洲(North America)' },
      { id: 4, pid: 0, level: 0, sid: '', name: '南美洲(South America)' },
      { id: 5, pid: 0, level: 0, sid: '', name: '非洲(Africa)' },
      { id: 6, pid: 0, level: 0, sid: '', name: '大洋洲(Oceania)' },
      { id: 7, pid: 0, level: 0, sid: '', name: '南极洲(Antarctica)' },
      { id: 8, pid: 1, level: 1, sid: '', name: '中国(China)' }
    ]
    let id = 8
    let nowPath = [8]
    let nowPathName = ['中国']
    let nowLevel = 2
    let last = []

    let taiWanID = 0 // 台湾
    let xiangGangID = 0 // 香港
    let aoMenID = 0 // 澳门

    for (const item of lines) {
      id++
      const [, lv2, lv3, lv4] = item[0].match(/(..)(..)(..)/)
      if (lv2 !== '00' && lv3 === '00' && lv4 === '00') { // 这是一个省
        nowLevel = 2
      } else if (lv2 !== '00' && lv3 !== '00' && lv4 === '00') { // 这是一个市
        nowLevel = 3
        if (lv2 !== last[0]) { // 万一这个市级所属省跟上一个的不一样，则这是一个国家直辖地级市，目前我国没有这种情况，万一遇到了，把它当成省级市吧
          nowLevel = 2
        }
      } else { // 这是一个县
        if (lv3 !== last[1]) { // 万一这个县级所属市跟上一个的不一样，则这是一个省直辖县级
          // 创建一个地级，否则多级选择时选不中它
          nowLevel = 3
          const addData = {
            id,
            pid: nowPath[nowLevel - 2] || 8,
            level: nowLevel,
            sid: `${lv2}${lv3}00`, // 这个编号是不存在的
            name: nowPathName[nowLevel - 2]
          }
          // 重庆特殊情况：它有两种类型的县级，一种叫县，一种叫区，id中间两位不一样。
          if (lv2 === '50') {
            if (lv3 === '01') {
              addData.name = '区'
            } else {
              addData.name = '县'
            }
          }
          datas.push(addData)
          nowPath[nowLevel - 1] = id
          nowPathName[nowLevel - 1] = nowPathName[nowLevel - 2]
          id++
        }
        nowLevel = 4
      }

      last = [lv2, lv3, lv4]

      nowPath[nowLevel - 1] = id
      nowPathName[nowLevel - 1] = item[1]

      if (item[0] === '710000' || item[1] === '台湾省') {
        taiWanID = id
      } else if (item[0] === '810000' || item[1] === '香港特别行政区') {
        xiangGangID = id
      } else if (item[0] === '820000' || item[1] === '澳门特别行政区') {
        aoMenID = id
      }

      datas.push({
        id,
        pid: nowPath[nowLevel - 2] || 8,
        level: nowLevel,
        sid: item[0],
        name: item[1]
      })

      if (['东莞市', '中山市', '三沙市', '儋州市', '嘉峪关市'].includes(item[1])) {
        const moreDatas = this.getOtherDatas(item[1], id, id)
        datas.push(...moreDatas)
        id += moreDatas.length
      }
    }

    const taiWanDatas = await this.taiWan(id, taiWanID)
    if (taiWanDatas.length) {
      datas.push(...taiWanDatas)
      id += taiWanDatas.length
    }

    const xiangGangDatas = await this.xiangGang(id, xiangGangID)
    if (xiangGangDatas.length) {
      datas.push(...xiangGangDatas)
      id += taiWanDatas.length
    }

    const aoMenDatas = await this.aoMen(id, aoMenID)
    if (aoMenDatas.length) {
      datas.push(...aoMenDatas)
      id += taiWanDatas.length
    }

    return datas
  },

  /**
   * 加入台湾的市
   * 根据wiki写死
   * https://zh.wikipedia.org/wiki/%E8%87%BA%E7%81%A3%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83#%E8%87%BA%E7%81%A3%E7%8F%BE%E8%A1%8C%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83
   *
   * @param id 上一个的id就好，这里会先 +1 才用的
   * @param areaID 这类数据的父级id
   * */
  async taiWan (id, areaID) {
    const ds = [
      { name: '台北市', level: 3 },
      { name: '中正区', level: 4 },
      { name: '大同区', level: 4 },
      { name: '中山区', level: 4 },
      { name: '松山区', level: 4 },
      { name: '大安区', level: 4 },
      { name: '万华区', level: 4 },
      { name: '信义区', level: 4 },
      { name: '士林区', level: 4 },
      { name: '北投区', level: 4 },
      { name: '内湖区', level: 4 },
      { name: '南港区', level: 4 },
      { name: '文山区', level: 4 },

      { name: '新北市', level: 3 },
      { name: '板桥区', level: 4 },
      { name: '新庄区', level: 4 },
      { name: '中和区', level: 4 },
      { name: '永和区', level: 4 },
      { name: '土城区', level: 4 },
      { name: '树林区', level: 4 },
      { name: '三峡区', level: 4 },
      { name: '莺歌区', level: 4 },
      { name: '三重区', level: 4 },
      { name: '芦洲区', level: 4 },
      { name: '五股区', level: 4 },
      { name: '泰山区', level: 4 },
      { name: '林口区', level: 4 },
      { name: '八里区', level: 4 },
      { name: '淡水区', level: 4 },
      { name: '三芝区', level: 4 },
      { name: '石门区', level: 4 },
      { name: '金山区', level: 4 },
      { name: '万里区', level: 4 },
      { name: '汐止区', level: 4 },
      { name: '瑞芳区', level: 4 },
      { name: '贡寮区', level: 4 },
      { name: '平溪区', level: 4 },
      { name: '双溪区', level: 4 },
      { name: '新店区', level: 4 },
      { name: '深坑区', level: 4 },
      { name: '石碇区', level: 4 },
      { name: '坪林区', level: 4 },
      { name: '乌来区', level: 4 },

      { name: '桃园市', level: 3 },
      { name: '桃园区', level: 4 },
      { name: '中坜区', level: 4 },
      { name: '大溪区', level: 4 },
      { name: '杨梅区', level: 4 },
      { name: '芦竹区', level: 4 },
      { name: '大园区', level: 4 },
      { name: '龟山区', level: 4 },
      { name: '八德区', level: 4 },
      { name: '龙潭区', level: 4 },
      { name: '平镇区', level: 4 },
      { name: '新屋区', level: 4 },
      { name: '观音区', level: 4 },
      { name: '复兴区', level: 4 },

      { name: '台中市', level: 3 },
      { name: '中区', level: 4 },
      { name: '东区', level: 4 },
      { name: '南区', level: 4 },
      { name: '西区', level: 4 },
      { name: '北区', level: 4 },
      { name: '北屯区', level: 4 },
      { name: '西屯区', level: 4 },
      { name: '南屯区', level: 4 },
      { name: '太平区', level: 4 },
      { name: '大里区', level: 4 },
      { name: '雾峰区', level: 4 },
      { name: '乌日区', level: 4 },
      { name: '丰原区', level: 4 },
      { name: '后里区', level: 4 },
      { name: '石冈区', level: 4 },
      { name: '东势区', level: 4 },
      { name: '和平区', level: 4 },
      { name: '新社区', level: 4 },
      { name: '潭子区', level: 4 },
      { name: '大雅区', level: 4 },
      { name: '神冈区', level: 4 },
      { name: '大肚区', level: 4 },
      { name: '龙井区', level: 4 },
      { name: '沙鹿区', level: 4 },
      { name: '梧栖区', level: 4 },
      { name: '清水区', level: 4 },
      { name: '大甲区', level: 4 },
      { name: '外埔区', level: 4 },
      { name: '大安区', level: 4 },

      { name: '台南市', level: 3 },
      { name: '东区', level: 4 },
      { name: '南区', level: 4 },
      { name: '北区', level: 4 },
      { name: '安南区', level: 4 },
      { name: '安平区', level: 4 },
      { name: '中西区', level: 4 },
      { name: '新营区', level: 4 },
      { name: '盐水区', level: 4 },
      { name: '白河区', level: 4 },
      { name: '柳营区', level: 4 },
      { name: '后壁区', level: 4 },
      { name: '东山区', level: 4 },
      { name: '麻豆区', level: 4 },
      { name: '下营区', level: 4 },
      { name: '六甲区', level: 4 },
      { name: '官田区', level: 4 },
      { name: '大内区', level: 4 },
      { name: '佳里区', level: 4 },
      { name: '学甲区', level: 4 },
      { name: '西港区', level: 4 },
      { name: '七股区', level: 4 },
      { name: '将军区', level: 4 },
      { name: '北门区', level: 4 },
      { name: '新化区', level: 4 },
      { name: '善化区', level: 4 },
      { name: '新市区', level: 4 },
      { name: '安定区', level: 4 },
      { name: '山上区', level: 4 },
      { name: '玉井区', level: 4 },
      { name: '楠西区', level: 4 },
      { name: '南化区', level: 4 },
      { name: '左镇区', level: 4 },
      { name: '仁德区', level: 4 },
      { name: '归仁区', level: 4 },
      { name: '关庙区', level: 4 },
      { name: '龙崎区', level: 4 },
      { name: '永康区', level: 4 },

      { name: '高雄市', level: 3 },
      { name: '盐埕区', level: 4 },
      { name: '鼓山区', level: 4 },
      { name: '左营区', level: 4 },
      { name: '楠梓区', level: 4 },
      { name: '三民区', level: 4 },
      { name: '新兴区', level: 4 },
      { name: '前金区', level: 4 },
      { name: '苓雅区', level: 4 },
      { name: '前镇区', level: 4 },
      { name: '旗津区', level: 4 },
      { name: '小港区', level: 4 },
      { name: '凤山区', level: 4 },
      { name: '林园区', level: 4 },
      { name: '大寮区', level: 4 },
      { name: '大树区', level: 4 },
      { name: '大社区', level: 4 },
      { name: '仁武区', level: 4 },
      { name: '鸟松区', level: 4 },
      { name: '冈山区', level: 4 },
      { name: '桥头区', level: 4 },
      { name: '燕巢区', level: 4 },
      { name: '田寮区', level: 4 },
      { name: '阿莲区', level: 4 },
      { name: '路竹区', level: 4 },
      { name: '湖内区', level: 4 },
      { name: '茄萣区', level: 4 },
      { name: '永安区', level: 4 },
      { name: '弥陀区', level: 4 },
      { name: '梓官区', level: 4 },
      { name: '旗山区', level: 4 },
      { name: '美浓区', level: 4 },
      { name: '六龟区', level: 4 },
      { name: '甲仙区', level: 4 },
      { name: '杉林区', level: 4 },
      { name: '内门区', level: 4 },
      { name: '茂林区', level: 4 },
      { name: '桃源区', level: 4 },
      { name: '那玛夏区', level: 4 },

      { name: '基隆市', level: 3 },
      { name: '中正区', level: 4 },
      { name: '七堵区', level: 4 },
      { name: '暖暖区', level: 4 },
      { name: '仁爱区', level: 4 },
      { name: '中山区', level: 4 },
      { name: '安乐区', level: 4 },
      { name: '信义区', level: 4 },

      { name: '新竹市', level: 3 },
      { name: '东区', level: 4 },
      { name: '北区', level: 4 },
      { name: '香山区', level: 4 },

      { name: '嘉义市', level: 3 },
      { name: '东区', level: 4 },
      { name: '西区', level: 4 },

      { name: '新竹县', level: 3 },
      { name: '竹北市', level: 4 },
      { name: '关西镇', level: 4 },
      { name: '新埔镇', level: 4 },
      { name: '竹东镇', level: 4 },
      { name: '湖口乡', level: 4 },
      { name: '横山乡', level: 4 },
      { name: '新丰乡', level: 4 },
      { name: '芎林乡', level: 4 },
      { name: '宝山乡', level: 4 },
      { name: '北埔乡', level: 4 },
      { name: '峨眉乡', level: 4 },
      { name: '尖石乡', level: 4 },
      { name: '五峰乡', level: 4 },

      { name: '苗栗县', level: 3 },
      { name: '苗栗市', level: 4 },
      { name: '头份市', level: 4 },
      { name: '苑里镇', level: 4 },
      { name: '通霄镇', level: 4 },
      { name: '竹南镇', level: 4 },
      { name: '后龙镇', level: 4 },
      { name: '卓兰镇', level: 4 },
      { name: '大湖乡', level: 4 },
      { name: '公馆乡', level: 4 },
      { name: '铜锣乡', level: 4 },
      { name: '南庄乡', level: 4 },
      { name: '头屋乡', level: 4 },
      { name: '三义乡', level: 4 },
      { name: '西湖乡', level: 4 },
      { name: '造桥乡', level: 4 },
      { name: '三湾乡', level: 4 },
      { name: '狮潭乡', level: 4 },
      { name: '泰安乡', level: 4 },

      { name: '彰化县', level: 3 },
      { name: '彰化市', level: 4 },
      { name: '员林市', level: 4 },
      { name: '和美镇', level: 4 },
      { name: '鹿港镇', level: 4 },
      { name: '北斗镇', level: 4 },
      { name: '溪湖镇', level: 4 },
      { name: '田中镇', level: 4 },
      { name: '二林镇', level: 4 },
      { name: '线西乡', level: 4 },
      { name: '伸港乡', level: 4 },
      { name: '福兴乡', level: 4 },
      { name: '秀水乡', level: 4 },
      { name: '花坛乡', level: 4 },
      { name: '芬园乡', level: 4 },
      { name: '大村乡', level: 4 },
      { name: '埔盐乡', level: 4 },
      { name: '埔心乡', level: 4 },
      { name: '永靖乡', level: 4 },
      { name: '社头乡', level: 4 },
      { name: '二水乡', level: 4 },
      { name: '田尾乡', level: 4 },
      { name: '埤头乡', level: 4 },
      { name: '芳苑乡', level: 4 },
      { name: '大城乡', level: 4 },
      { name: '竹塘乡', level: 4 },
      { name: '溪州乡', level: 4 },

      { name: '南投县', level: 3 },
      { name: '南投市', level: 4 },
      { name: '埔里镇', level: 4 },
      { name: '草屯镇', level: 4 },
      { name: '竹山镇', level: 4 },
      { name: '集集镇', level: 4 },
      { name: '名间乡', level: 4 },
      { name: '鹿谷乡', level: 4 },
      { name: '中寮乡', level: 4 },
      { name: '鱼池乡', level: 4 },
      { name: '国姓乡', level: 4 },
      { name: '水里乡', level: 4 },
      { name: '信义乡', level: 4 },
      { name: '仁爱乡', level: 4 },

      { name: '云林县', level: 3 },
      { name: '斗六市', level: 4 },
      { name: '斗南镇', level: 4 },
      { name: '虎尾镇', level: 4 },
      { name: '西螺镇', level: 4 },
      { name: '土库镇', level: 4 },
      { name: '北港镇', level: 4 },
      { name: '古坑乡', level: 4 },
      { name: '大埤乡', level: 4 },
      { name: '莿桐乡', level: 4 },
      { name: '林内乡', level: 4 },
      { name: '二𪨧(仑)乡', level: 4 },
      { name: '𪨧(仑)背乡', level: 4 },
      { name: '麦寮乡', level: 4 },
      { name: '东势乡', level: 4 },
      { name: '褒忠乡', level: 4 },
      { name: '台西乡', level: 4 },
      { name: '元长乡', level: 4 },
      { name: '四湖乡', level: 4 },
      { name: '口湖乡', level: 4 },
      { name: '水林乡', level: 4 },

      { name: '嘉义县', level: 3 },
      { name: '太保市', level: 4 },
      { name: '朴子市', level: 4 },
      { name: '布袋镇', level: 4 },
      { name: '大林镇', level: 4 },
      { name: '民雄乡', level: 4 },
      { name: '溪口乡', level: 4 },
      { name: '新港乡', level: 4 },
      { name: '六脚乡', level: 4 },
      { name: '东石乡', level: 4 },
      { name: '义竹乡', level: 4 },
      { name: '鹿草乡', level: 4 },
      { name: '水上乡', level: 4 },
      { name: '中埔乡', level: 4 },
      { name: '竹崎乡', level: 4 },
      { name: '梅山乡', level: 4 },
      { name: '番路乡', level: 4 },
      { name: '大埔乡', level: 4 },
      { name: '阿里山乡', level: 4 },

      { name: '屏东县(屏东市)', level: 3 },
      { name: '屏东市', level: 4 },
      { name: '潮州镇', level: 4 },
      { name: '东港镇', level: 4 },
      { name: '恒春镇', level: 4 },
      { name: '万丹乡', level: 4 },
      { name: '长治乡', level: 4 },
      { name: '麟洛乡', level: 4 },
      { name: '九如乡', level: 4 },
      { name: '里港乡', level: 4 },
      { name: '盐埔乡', level: 4 },
      { name: '高树乡', level: 4 },
      { name: '万峦乡', level: 4 },
      { name: '内埔乡', level: 4 },
      { name: '竹田乡', level: 4 },
      { name: '新埤乡', level: 4 },
      { name: '枋寮乡', level: 4 },
      { name: '新园乡', level: 4 },
      { name: '崁顶乡', level: 4 },
      { name: '林边乡', level: 4 },
      { name: '南州乡', level: 4 },
      { name: '佳冬乡', level: 4 },
      { name: '琉球乡', level: 4 },
      { name: '车城乡', level: 4 },
      { name: '满州乡', level: 4 },
      { name: '枋山乡', level: 4 },
      { name: '三地门乡', level: 4 },
      { name: '雾台乡', level: 4 },
      { name: '玛家乡', level: 4 },
      { name: '泰武乡', level: 4 },
      { name: '来义乡', level: 4 },
      { name: '春日乡', level: 4 },
      { name: '狮子乡', level: 4 },
      { name: '牡丹乡', level: 4 },

      { name: '宜兰县', level: 3 },
      { name: '宜兰市', level: 4 },
      { name: '罗东镇', level: 4 },
      { name: '苏澳镇', level: 4 },
      { name: '头城镇', level: 4 },
      { name: '礁溪乡', level: 4 },
      { name: '壮围乡', level: 4 },
      { name: '员山乡', level: 4 },
      { name: '冬山乡', level: 4 },
      { name: '五结乡', level: 4 },
      { name: '三星乡', level: 4 },
      { name: '大同乡', level: 4 },
      { name: '南澳乡', level: 4 },

      { name: '花莲县', level: 3 },
      { name: '花莲市', level: 4 },
      { name: '凤林镇', level: 4 },
      { name: '玉里镇', level: 4 },
      { name: '新城乡', level: 4 },
      { name: '吉安乡', level: 4 },
      { name: '寿丰乡', level: 4 },
      { name: '光复乡', level: 4 },
      { name: '丰滨乡', level: 4 },
      { name: '瑞穗乡', level: 4 },
      { name: '富里乡', level: 4 },
      { name: '秀林乡', level: 4 },
      { name: '万荣乡', level: 4 },
      { name: '卓溪乡', level: 4 },

      { name: '台东县', level: 3 },
      { name: '台东市', level: 4 },
      { name: '成功镇', level: 4 },
      { name: '关山镇', level: 4 },
      { name: '卑南乡', level: 4 },
      { name: '大武乡', level: 4 },
      { name: '太麻里乡', level: 4 },
      { name: '东河乡', level: 4 },
      { name: '长滨乡', level: 4 },
      { name: '鹿野乡', level: 4 },
      { name: '池上乡', level: 4 },
      { name: '绿岛乡', level: 4 },
      { name: '延平乡', level: 4 },
      { name: '海端乡', level: 4 },
      { name: '达仁乡', level: 4 },
      { name: '金峰乡', level: 4 },
      { name: '兰屿乡', level: 4 },

      { name: '澎湖县', level: 3 },
      { name: '马公市', level: 4 },
      { name: '湖西乡', level: 4 },
      { name: '白沙乡', level: 4 },
      { name: '西屿乡', level: 4 },
      { name: '望安乡', level: 4 },
      { name: '七美乡', level: 4 }
    ]

    const datas = []
    let pid = areaID
    for (const item of ds) {
      id++
      if (item.level === 3) {
        pid = id
      }
      datas.push({
        id,
        pid: item.level === 3 ? areaID : pid,
        level: item.level,
        sid: '',
        name: item.name
      })
    }
    return datas
  },

  /**
   * 加入香港的区划
   * 根据wiki写死
   * https://zh.wikipedia.org/wiki/%E9%A6%99%E6%B8%AF%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83#%E5%8D%80%E8%AD%B0%E6%9C%83
   *
   * @param id 上一个的id就好，这里会先 +1 才用的
   * @param areaID 这类数据的父级id
   * */
  async xiangGang (id, areaID) {
    const ds = [
      { name: '香港岛', level: 3 },
      { name: '中西区', level: 4 },
      { name: '湾仔区', level: 4 },
      { name: '东区', level: 4 },
      { name: '南区', level: 4 },

      { name: '九龙', level: 3 },
      { name: '油尖旺区', level: 4 },
      { name: '深水埗区', level: 4 },
      { name: '九龙城区', level: 4 },
      { name: '黄大仙区', level: 4 },
      { name: '观塘区', level: 4 },

      { name: '新界', level: 3 },
      { name: '葵青区', level: 4 },
      { name: '荃湾区', level: 4 },
      { name: '屯门区', level: 4 },
      { name: '元朗区', level: 4 },
      { name: '北区', level: 4 },
      { name: '大埔区', level: 4 },
      { name: '沙田区', level: 4 },
      { name: '西贡区', level: 4 },
      { name: '离岛区', level: 4 }
    ]

    const datas = []
    let pid = areaID
    for (const item of ds) {
      id++
      if (item.level === 3) {
        pid = id
      }
      datas.push({
        id,
        pid: item.level === 3 ? areaID : pid,
        level: item.level,
        sid: '',
        name: item.name
      })
    }
    return datas
  },

  /**
   * 加入澳门的区划
   * 根据wiki写死
   * https://zh.wikipedia.org/wiki/%E6%BE%B3%E9%96%80%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83#%E8%A1%8C%E6%94%BF%E5%8D%80%E5%8A%83%E5%88%86
   *
   * @param id 上一个的id就好，这里会先 +1 才用的
   * @param areaID 这类数据的父级id
   * */
  async aoMen (id, areaID) {
    const ds = [
      // 澳门特别行政区 澳门半岛 氹仔路 氹城
      { name: '澳门特别行政区', level: 3 },
      { name: '澳门半岛', level: 4 },
      { name: '氹仔', level: 4 },
      { name: '路氹城', level: 4 },
      { name: '路环', level: 4 }
    ]

    const datas = []
    let pid = areaID
    for (const item of ds) {
      id++
      if (item.level === 3) {
        pid = id
      }
      datas.push({
        id,
        pid: item.level === 3 ? areaID : pid,
        level: item.level,
        sid: '',
        name: item.name
      })
    }
    return datas
  },

  /**
   * 获取不设区的地级市的下一级数据
   * 一共是：东莞市、中山市、三沙市、儋州市、嘉峪关市
   * @param city 城市名，拼音小写
   * @param cityID 这个城市的id
   * @param id 现在最大的id是多少了
   * */
  getOtherDatas (city, cityID, id) {
    const allDatas = {
      '东莞市': ['莞城街道', '东城街道', '南城街道', '万江街道',
        '石碣镇', '高埗镇', '麻涌镇', '洪梅镇',
        '中堂镇',
        '望牛墩镇',
        '道滘镇',
        '虎门镇',
        '长安镇',
        '厚街镇',
        '沙田镇',
        '东莞港开发区',
        '石龙镇',
        '石排镇',
        '茶山镇',
        '寮步镇',
        '大岭山镇',
        '大朗镇',
        '松山湖高新区',
        '常平镇',
        '黄江镇',
        '企石镇',
        '桥头镇',
        '横沥镇',
        '谢岗镇',
        '东部工业园',
        '塘厦镇',
        '清溪镇',
        '樟木头镇',
        '凤岗镇'
      ],
      '中山市': [
        '石岐街道', '东区街道', '西区街道', '南区街道', '五桂山街道', '中山火炬高技术产业开发区',
        '黄圃镇', '南头镇', '东凤镇', '阜沙镇', '小榄镇', '东升镇', '古镇镇', '横栏镇', '三角镇', '民众镇', '南朗镇', '港口镇', '大涌镇', '沙溪镇', '三乡镇', '板芙镇', '神湾镇', '坦洲镇'
      ],
      '三沙市': [
        '西沙群岛',
        '中沙群岛',
        '南沙群岛'
      ],
      '儋州市': [
        '那大镇', '和庆镇', '南丰镇', '大成镇', '雅星镇', '兰洋镇', '光村镇', '木棠镇', '海头镇', '峨蔓镇',
        '王五镇', '白马井镇', '中和镇', '排浦镇', '东成镇', '新州镇', '国营八一总场', '国营蓝洋农场', '国营西联农场', '国营西培农场'
      ],
      '嘉峪关市': [
        '立雄关区', '长城区', '镜铁区',
        '胜利街道', '五一街道', '矿山街道', '新华街道', '建设街道', '前进街道', '峪苑街道', '朝阳街道',
        '峪泉镇', '文殊镇', '新城镇'
      ]
    }

    const ds = allDatas[city]
    if (!ds) {
      return []
    }

    const datas = []
    for (const item of ds) {
      id++
      datas.push({
        id,
        pid: cityID,
        level: 4,
        sid: '',
        name: item
      })
    }
    return datas
  },

  /**
   * 模拟浏览器把数据加载回来，加载回的数据不会处理。
   * */
  async getDataLikeChrome (url, ua, qs, cookies) {
    if (cookies) {
      const cookiesArr = []
      for (const [k, v] of Object.entries(cookies)) {
        cookiesArr.push(`${k}=${v}`)
      }
      cookies = cookiesArr.join('; ')
    }
    const { headers, body } = await requestPro({
      method: 'GET',
      uri: url,
      headers: { // 指定请求头
        'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
        'Connection': 'keep-alive',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8', // 指定 Accept-Language
        'Cookie': cookies || '' // 指定 Cookie
      },
      qs: qs || {},
      resolveWithFullResponse: true // 默认只返回body内容，把这个设为true，就会返回所有内容
    })

    return { headers, body }
  }
}
