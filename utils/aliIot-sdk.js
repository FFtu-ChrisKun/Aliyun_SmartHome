var crypto = require("/cryptojs-master/cryptojs.js").Crypto
var uuid = require("/uuid.js")
const app = getApp()

//格式化数字
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

//首字母大写
const firstLetterUpper = str => {
  return str.slice(0, 1).toUpperCase() + str.slice(1);
}

//格式化参数
const formatParams = params => {
  var keys = Object.keys(params)
  var newParams = {}
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    newParams[firstLetterUpper(key)] = params[key]
  }
  return newParams;
}

//参数排序
const sortParams = params => {
  var keys = Object.keys(params).sort()
  var newParams = {}
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    newParams[key] = params[key]
  }
  return newParams;
}

//生成规定时间格式
const timestamp = () => {
  var date = new Date();
  var YYYY = date.getUTCFullYear();
  var MM = formatNumber(date.getUTCMonth() + 1);
  var DD = formatNumber(date.getUTCDate());
  var HH = formatNumber(date.getUTCHours());
  var mm = formatNumber(date.getUTCMinutes());
  var ss = formatNumber(date.getUTCSeconds());
  // 删除掉毫秒部分
  return `${YYYY}-${MM}-${DD}T${HH}:${mm}:${ss}Z`;
}

//url编码
const encode = (str) => {
  var result = encodeURIComponent(str);

  return result.replace(/\!/g, '%21')
    .replace(/\'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

//将数组参数格式化成url传参方式
const replaceRepeatList = (target, key, repeat) => {
  for (var i = 0; i < repeat.length; i++) {
    var item = repeat[i];

    if (item && typeof item === 'object') {
      const keys = Object.keys(item);
      for (var j = 0; j < keys.length; j++) {
        target[`${key}.${i + 1}.${keys[j]}`] = item[keys[j]];
      }
    } else {
      target[`${key}.${i + 1}`] = item;
    }
  }
}

//将所有重复参数展开平面化
const flatParams = (params) => {
  var target = {};
  var keys = Object.keys(params);
  for (let i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = params[key];
    if (Array.isArray(value)) {
      replaceRepeatList(target, key, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

//将所有参数以特定格式放进数组中
const normalize = (params) => {
  var list = [];
  var flated = flatParams(params);
  var keys = Object.keys(flated).sort();
  for (let i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = flated[key];
    list.push([encode(key), encode(value)]); 
  }
  return list;
}

//按传参名首字母顺序将所有参数以特定格式放进数组中
const canonicalize = (normalized) => {
  var fields = [];
  for (var i = 0; i < normalized.length; i++) {
    var [key, value] = normalized[i];
    fields.push(key + '=' + value);
  }
  return fields.join('&');
}

//构建公共参数
const _buildParams = () => {
  var defaultParams = {
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: uuid.uuid(),
    SignatureVersion: '1.0',
    Timestamp: timestamp(),
    AccessKeyId: app.globalData.ai,
    Version: app.globalData.apiVersion,
    RegionId: "cn-shanghai"
  };
  return defaultParams;
}

//封装request
const request = (params, opts, success, fail, complete) => {
  params = formatParams(params)
  params.Action = firstLetterUpper(params.Action)
  var defaultParams = _buildParams()
  params = Object.assign(defaultParams, params)

  var method = (opts.method || 'GET').toUpperCase()
  var normalized = normalize(params)
  var canonicalized = canonicalize(normalized)

  var stringToSign = `${method}&${encode('/')}&${encode(canonicalized)}`

  const key = app.globalData.as + '&'

  var signature = crypto.HMAC(crypto.SHA1, stringToSign, key, {
    asBase64: true
  })

  normalized.push(['Signature', encode(signature)])

  const url = method === 'POST' ? `${app.globalData.endpoint}/` : `${app.globalData.endpoint}/?${canonicalize(normalized)}`
  if (method === 'POST') {
    opts.headers = opts.headers || {};
    opts.headers['content-type'] = 'application/x-www-form-urlencoded'
    opts.data = canonicalize(normalized)
  }

  wx.request({
    url: url,
    data: opts.data ? opts.data : {},
    header: opts.headers,
    method: method,
    dataType: 'json',
    responseType: 'text',
    success: function(res) {
      if (typeof success === 'function')
        success(res)
      else
        console.log("success is not a function")
    },
    fail: function(res) {
      if (typeof fail === 'function')
        fail(res)
      else
        console.log("fail is not a function")
    },
    complete: function(res) {
      if (typeof complete === 'function')
        complete()
      else
        console.log("complete is not a function")
    }
  })
}

module.exports = {
  request: request
}