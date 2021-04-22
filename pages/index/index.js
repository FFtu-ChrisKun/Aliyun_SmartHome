// pages/index/index.js

const app = getApp()
const iot = require("../../utils/aliIot-sdk.js")
const util = require('../../utils/util.js')
var mqtt = require('../../utils/mqtt.min.js')
const crypto = require('../../utils/hex_hmac_sha1.js')
var client
var interval

Page({

  /**
   * 页面的初始数据
   */
  data: {
    temperature: '--',
    humidity: '--',
    pm2_5: '--',
    co2: '--',
    switchLED: false, //用于控制LED灯亮灭
    isconnect: false, //用于检查高备是否上线
    imageUrl: '../../images/LED_off.png',
    LightLux: '--',
    SoundDecibelValue: '--',
    JSONdata: '',
    alarm: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    var that = this
      that.loadData()
      setInterval(function () {
        that.loadData();
        //      that.DataAlarm();
        setTimeout(function () {
          if (that.data.alarm) { //如果数据监控报警开启
            that.setData({
              color_t: 'black',
              color_l: 'black',
              color_s: 'black',
              color_h: 'black',
              color_c: 'black',
              color_p: 'black',
            })
            if (that.data.temperature >= 30) {
              that.setData({
                color_t: 'red',
              })
              //               that.temperatureAlarm()
            }
            if (that.data.humidity >= 50) {
              that.setData({
                color_h: 'red',
              })
              //              that.humidityAlarm()
            }
            if (that.data.LightLux >= 550) {
              that.setData({
                color_l: 'red',
              })
              //               that.lightAlarm()
            }
            if (that.data.co2 >= 60) {
              that.setData({
                color_c: 'red',
              })
              //                that.co2Alarm()
            }
            if (that.data.pm2_5 >= 100) {
              that.setData({
                color_p: 'red',
              })
              //               that.PM25Alarm()
            }
            if (that.data.SoundDecibelValue >= 300) {
              that.setData({
                color_s: 'red',
              })
              //                that.soundAlarm()
            }
          }
        }, 500);
      }, 5000);
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    wx.showLoading({
      title: '刷新中...',
      duration: 3000
    })
    this.onShow()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  loadData: function () {
    var that = this;
    //使用封装的request访问数据
    iot.request({
        Action: "QueryDevicePropertyStatus",
        ProductKey: app.globalData.productKey,
        DeviceName: app.globalData.deviceName,
      }, {
        method: "POST"
      },
      (res) => {
        console.log("success")
        console.log(res)
        if (res.data.Code) {
          console.log(res.data.ErrorMessage)
          wx.showToast({
            title: '设备连接失败',
            icon: 'none',
            duration: 1000,
            complete: () => {}
          })
          that.setJSData(null)
        } else {
          that.setJSData(res.data.Data.List.PropertyStatusInfo)
        }
      },
      (res) => {
        console.log("fail")
        wx.showToast({
          title: '网络连接失败',
          icon: 'none',
          duration: 1000,
          complete: () => {}
        })
        this.setJSData(null)
      },
      (res) => {
        console.log("complete")
      })
  },
  //设置数据在前端显示
  setJSData: function (infos) {
    var that = this
    if (infos) {
      //将返回结果转换成JSON格式
      var jsondata = {}
      infos.forEach((item) => {
        jsondata[item.Identifier] = item.Value ? item.Value : null
      })
      console.log("jsondata=", jsondata)
      const led = wx.getStorageSync('LED')
      //传入数值
      that.setData({
        temperature: jsondata.temperature,
        humidity: jsondata.humidity,
        pm2_5: jsondata.pm2_5,
        co2: jsondata.co2,
        LightLux: jsondata.LightLux,
        SoundDecibelValue: jsondata.SoundDecibelValue,
        switchLED: led,
        imageUrl: led ? '../../images/LED_on.png' : '../../images/LED_off.png',
      })
    }
  },

  //连接IoT
  connectIoT: function () {
    var that = this
    const options = this.initMqttOptions({
      productKey: app.globalData.productKey,
      deviceName: app.globalData.deviceName,
      deviceSecret: app.globalData.deviceSecret,
      regionId: app.globalData.regionId
    })
    //使用wxs方式通信
    client = mqtt.connect('wxs://productKey.iot-as-mqtt.cn-shanghai.aliyuncs.com', options)
    client.on('connect', function () {
      console.log('连接服务器成功')
      let dateTime = util.formatTime(new Date());
      that.setData({
        deviceState: dateTime + 'Connect Success!',
        isconnect: true,
      })
    })
  },

  //IoT平台mqtt连接初始化:
  initMqttOptions: function (options) {
    const params = {
      productKey: options.productKey,
      deviceName: options.deviceName,
      timestamp: Date.now(),
      clientId: Math.random().toString(36).substr(2)
    }
    //connect参数
    const conoptions = {
      keepalive: 60, //s
      clean: true, //clean Session
      protocolVersion: 4
    }
    //生成clientId、username、password
    conoptions.password = this.signHmacSha1(params, options.deviceSecret)
    conoptions.clientId = `${params.clientId}|securemode=2,signmethod=hmacsha1,timestamp=${params.timestamp}|`
    conoptions.username = `${params.deviceName}&${params.productKey}`

    return conoptions
  },

  /*
     生成基于HmacSha1的password
     参考文档：https://help.aliyun.com/document_detail/73742.html?#h2-url-1
   */
  signHmacSha1(params, deviceSecret) {
    let keys = Object.keys(params).sort();
    // 按字典序排序
    keys = keys.sort();
    const list = [];
    keys.map((key) => {
      list.push(`${key}${params[key]}`);
    });
    const contentStr = list.join('');
    return crypto.hex_hmac_sha1(deviceSecret, contentStr);
  },

  //设备下线
  DisconnectIoT: function () {
    if (!this.data.isconnect) {
      wx.showToast({
        title: '设备还未上线！',
        icon: 'none',
        duration: 1000,
        complete: () => {}
      })
    } else {
      var that = this
      client.end()
      console.log('服务器连接断开')
      let dateTime = util.formatTime(new Date());
      that.setData({
        deviceState: dateTime + 'Disconnect!',
        isconnect: false,
      })
      clearInterval(interval)
    }
  },

  //控制LED灯亮灭
  LEDswitch: function () {
    var isconnect = this.data.isconnect
    var that = this
    if (!isconnect) { //设备未上线，给出提示信息
      wx.showToast({
        title: '设备还未上线！',
        icon: 'none',
        duration: 1000,
        complete: () => {}
      })
      that.setData({
        switchLED: this.data.switchLED
      })
    } else { //设备已上线，调用服务
      if (!that.data.switchLED) { //如果LED灯处于关闭状态，则发送开启命令
        iot.request({
            Action: "InvokeThingService",
            ProductKey: app.globalData.productKey,
            DeviceName: app.globalData.deviceName,
            Identifier: "switch",
            Args: "{'status':'on'}"
          }, {
            method: 'POST'
          },
          (res) => {
            console.log("success")
            console.log(res)
            if (res.data.Code) {
              console.log(res.data.ErrorMessage)
              wx.showToast({
                title: '设备连接失败',
                icon: 'none',
                duration: 1000,
                complete: () => {}
              })
              that.setData({
                switchLED: that.data.switchLED
              })
            } else {
              that.setData({
                switchLED: !that.data.switchLED,
                imageUrl: '../../images/LED_on.png'
              })
              //             that.PostLED()
              wx.setStorageSync('LED', that.data.switchLED)
            }
          },
          (res) => {
            console.log("fail")
            wx.showToast({
              title: '网络连接失败',
              icon: 'none',
              duration: 1000,
              complete: () => {}
            })
            that.setData({
              switchLED: that.data.switchLED
            })
          },
          (res) => {
            console.log("complete")
          })
      }
      if (that.data.switchLED) { //如果LED灯处于开启状态，则发送关闭命令
        iot.request({
            Action: "InvokeThingService",
            ProductKey: app.globalData.productKey,
            DeviceName: app.globalData.deviceName,
            Identifier: "switch",
            Args: "{'status':'off'}"
          }, {
            method: 'POST'
          },
          (res) => {
            console.log("success")
            console.log(res)
            if (res.data.Code) {
              console.log(res.data.ErrorMessage)
              wx.showToast({
                title: '设备连接失败',
                icon: 'none',
                duration: 1000,
                complete: () => {}
              })
              that.setData({
                switchLED: that.data.switchLED
              })
            } else {
              that.setData({
                switchLED: !that.data.switchLED,
                imageUrl: '../../images/LED_off.png'
              })
              //             that.PostLED()
              wx.setStorageSync('LED', that.data.switchLED)
            }
          },
          (res) => {
            console.log("fail")
            wx.showToast({
              title: '网络连接失败',
              icon: 'none',
              duration: 1000,
              complete: () => {}
            })
            that.setData({
              switchLED: that.data.switchLED
            })
          },
          (res) => {
            console.log("complete")
          })
      }
    }
  },
  /*
    PostLED: function (e) {
      var that = this
      iot.request({
          Action: "SetDeviceProperty",
          Items: "{'LEDSwitch':'${that.data.switchLED}'}"
        }, {
          method: 'POST'
        },
        (res) => {
          console.log("success")
          console.log(res)
          if (res.data.Code) {
            console.log(res.data.ErrorMessage)
            wx.showToast({
              title: '设备连接失败',
              icon: 'none',
              duration: 1000,
              complete: () => {}
            })
          }
        },
        (res) => {
          console.log("fail")
          wx.showToast({
            title: '网络连接失败',
            icon: 'none',
            duration: 1000,
            complete: () => {}
          })
        },
        (res) => {
          console.log("complete")
        })
    },*/
  /*
    //将开关灯信息存入IoT属性值当中
    PostLED: function (e) {
      var that = this
      let topic = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/property/post`;
      let PostData = {
        id: Date.now(),
        params: {
          LEDSwitch: this.data.switchLED ? 1 : 0
        },
        method: "thing.event.property.post"
      }
      console.log("postData=", PostData)
      const jsonPostData = JSON.stringify(PostData)
      console.log("===jsonPostData\n topic=" + topic)
      console.log("payload=" + jsonPostData)
      console.log('%^$%%^$^$%^$%' + jsonPostData.params)
      client.publish(topic, jsonPostData)
    },
  */

  //进入数据上报页面填写数据
  PostData: function () {
    var that = this
    if (!this.data.isconnect) {
      wx.showToast({
        title: '设备还未上线！',
        icon: 'none',
        duration: 1000,
        complete: () => {}
      })
    } else {
      wx.navigateTo({
        url: '../postdata/postdata',
      })
      /*
      interval = setInterval(function () {
        that.POSTRandnumber()
      }, 5000);*/
    }
  },

  //封装输入的数据成JSON格式
  getJSONData: function () {
    const payload = {
      id: Date.now(),
      params: {
        temperature: this.data.temperature,
        humidity: this.data.humidity,
        LightLux: this.data.LightLux,
        co2: this.data.co2,
        pm2_5: this.data.pm2_5,
        SoundDecibelValue: this.data.SoundDecibelValue,
      },
      method: "thing.event.property.post"
    }
    return JSON.stringify(payload)
  },

  //生成随机数据并上传
  POSTRandnumber: function () {
    var that=this
    interval=setInterval(function() {
     that.setData({
        temperature: parseFloat((Math.random() * 100).toFixed(1)),
        humidity: parseFloat((Math.random() * 100).toFixed(1)),
        LightLux: parseFloat((Math.random() * 1000).toFixed(1)),
        co2: parseFloat((Math.random() * 100).toFixed(2)),
        pm2_5: parseFloat((Math.random() * 300).toFixed(2)),
        SoundDecibelValue: parseFloat((Math.random() * 500).toFixed(1)),
      })
      let jsondata = that.getJSONData()
      that.PostJsonData(jsondata)
        if (that.data.temperature >= 30) {
           that.temperatureAlarm()
         }
         if (that.data.humidity >= 50) {
           that.humidityAlarm()
         }
         if (that.data.LightLux >= 550) {
           that.lightAlarm()
         }
         if (that.data.co2 >= 60) {
          that.co2Alarm()
         }
         if (that.data.pm2_5 >= 100) {
           that.PM25Alarm()
         }
         if (that.data.SoundDecibelValue >= 300) {
           that.soundAlarm()
         }
    }, 10000);
    /*
    this.setData({
      temperature: parseFloat((Math.random() * 100).toFixed(1)),
      humidity: parseFloat((Math.random() * 100).toFixed(1)),
      LightLux: parseFloat((Math.random() * 1000).toFixed(1)),
      co2: parseFloat((Math.random() * 100).toFixed(2)),
      pm2_5: parseFloat((Math.random() * 300).toFixed(2)),
      SoundDecibelValue: parseFloat((Math.random() * 500).toFixed(1)),
    })
    let jsondata = this.getJSONData()
    this.PostJsonData(jsondata)*/
  },
  //上报数据
  PostJsonData: function (jsondata) {
    var that = this
    let topic = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/property/post`;
    console.log("===jsonPostData\n topic=" + topic)
    console.log("payload=" + jsondata)
    console.log('%^$%%^$^$%^$%' + jsondata.params)
    client.publish(topic, jsondata)
  },

    //调用温度过高告警事件
    temperatureAlarm: function () {
      var that = this;
      let topic_alarm = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/hotAlarm/post`;
      const payload = {
        id: Date.now(),
        params: {
          //hotAlarmProperty: that.data.temperaturealarm?1:0
          temperature: that.data.temperature * 1.0
        },
        method: "thing.event.hotAlarm.post"
      }
      let JSONdata = JSON.stringify(payload)
      console.log("===postData\n topic=" + topic_alarm)
      console.log("payload=" + JSONdata)
      client.publish(topic_alarm, JSONdata)
    /*  that.setData({
        color_t: "red"
      })*/
    },
    //调用湿度过高告警事件
    humidityAlarm: function () {
      var that = this;
      let topic_alarm = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/HumidityAlarm/post`;
      const payload = {
        id: Date.now(),
        params: {
          //humidityAlarmProperty: that.data.humidityalarm?1:0
          humidity: that.data.humidity * 1.0
        },
        method: "thing.event.HumidityAlarm.post"
      }
      let JSONdata = JSON.stringify(payload)
      console.log("===postData\n topic=" + topic_alarm)
      console.log("payload=" + JSONdata)
      client.publish(topic_alarm, JSONdata)
     /* that.setData({
        color_h: "red"
      })*/
    },
    //调用光照强度过高告警事件
    lightAlarm: function () {
      var that = this;
      let topic_alarm = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/lightAlarm/post`;
      const payload = {
        id: Date.now(),
        params: {
          //lightAlarmProperty: that.data.LightLuxalarm?1:0
          LightLux: that.data.LightLux * 1.0
        },
        method: "thing.event.lightAlarm.post"
      }
      let JSONdata = JSON.stringify(payload)
      console.log("===postData\n topic=" + topic_alarm)
      console.log("payload=" + JSONdata)
      client.publish(topic_alarm, JSONdata)
      /*that.setData({
        color_l: "red"
      })*/
    },
    //调用二氧化碳过高告警事件
    co2Alarm: function () {
      var that = this;
      let topic_alarm = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/co2Alarm/post`;
      const payload = {
        id: Date.now(),
        params: {
          //co2AlarmProperty: that.data.co2alarm?1:0
          co2: that.data.co2 * 1.0
        },
        method_c: "thing.event.co2Alarm.post"
      }
      let JSONdata = JSON.stringify(payload)
      console.log("===postData\n topic=" + topic_alarm)
      console.log("payload=" + JSONdata)
      client.publish(topic_alarm, JSONdata)
     /* that.setData({
        color_c: "red"
      })*/
    },
    //调用PM2.5过高告警事件
    PM25Alarm: function () {
      var that = this;
      let topic_alarm = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/pm25Alarm/post`;
      const payload = {
        id: Date.now(),
        params: {
          //pm25AlarmProperty: that.data.pm2_5alarm?1:0
          pm2_5: that.data.pm2_5 * 1.0
        },
        method: "thing.event.pm25Alarm.post"
      }
      let JSONdata = JSON.stringify(payload)
      console.log("===postData\n topic=" + topic_alarm)
      console.log("payload=" + JSONdata)
      client.publish(topic_alarm, JSONdata)
    /*  that.setData({
        color_p: "red"
      })*/
    },
    //调用噪声过高告警事件
    soundAlarm: function () {
      var that = this;
      let topic_alarm = `/sys/${app.globalData.productKey}/${app.globalData.deviceName}/thing/event/soundAlarm/post`;
      const payload = {
        id: Date.now(),
        params: {
          //soundAlarmProperty: that.data.SoundDecibelValuealarm?1:0
          SoundDecibelValue: that.data.SoundDecibelValue * 1.0
        },
        method: "thing.event.soundAlarm.post"
      }
      let JSONdata = JSON.stringify(payload)
      console.log("===postData\n topic=" + topic_alarm)
      console.log("payload=" + JSONdata)
      client.publish(topic_alarm, JSONdata)
      /*that.setData({
        color_s: "red"
      })*/
    },

  //开启数据监控报警
  DataAlarm: function () {
    var isconnect = this.data.isconnect
    var that = this
    if (!isconnect) { //设备未上线，给出提示信息
      wx.showToast({
        title: '设备还未上线！',
        icon: 'none',
        duration: 1000,
        complete: () => {}
      })
      that.setData({
        alarm: that.data.alarm
      })
    } else { //设备已上线，调用服务
      /* if (that.data.alarm) { //如果数据监控报警开启
         that.setData({
           color_t: 'black',
           color_l: 'black',
           color_s: 'black',
           color_h: 'black',
           color_c: 'black',
           color_p: 'black',
         })
         if (that.data.temperature >= 30) {
           that.setData({
             color_t: 'red',
           })
           //               that.temperatureAlarm()
         }
         if (that.data.humidity >= 50) {
           that.setData({
             color_h: 'red',
           })
           //              that.humidityAlarm()
         }
         if (that.data.LightLux >= 550) {
           that.setData({
             color_l: 'red',
           })
           //               that.lightAlarm()
         }
         if (that.data.co2 >= 60) {
           that.setData({
             color_c: 'red',
           })
           //                that.co2Alarm()
         }
         if (that.data.pm2_5 >= 100) {
           that.setData({
             color_p: 'red',
           })
           //               that.PM25Alarm()
         }
         if (that.data.SoundDecibelValue >= 300) {
           that.setData({
             color_s: 'red',
           })
           //                that.soundAlarm()
         }*/
      if (that.data.alarm) { //如果数据监控报警开启，则发送关闭指令，并将各报警标志位归0
        that.setData({
          color_t: 'black',
          color_l: 'black',
          color_s: 'black',
          color_h: 'black',
          color_c: 'black',
          color_p: 'black',
          alarm: !that.data.alarm
        })
      } else if (!that.data.alarm) { //如果数据监控报警关闭，则发送开启指令并判断是是否符合报警条件
        /*
        if (that.data.temperature >= 30) {
          // that.temperatureAlarm()
         }
         if (that.data.humidity >= 50) {
           //that.humidityAlarm()
         }
         if (that.data.LightLux >= 550) {
           //that.lightAlarm()
         }
         if (that.data.co2 >= 60) {
           //that.co2Alarm()
         }
         if (that.data.pm2_5 >= 100) {
           //that.PM25Alarm()
         }
         if (that.data.SoundDecibelValue >= 300) {
           //that.soundAlarm()
         }*/
        if (that.data.temperature >= 30) {
          that.setData({
            color_t: 'red',
          })
          //               that.temperatureAlarm()
        }
        if (that.data.humidity >= 50) {
          that.setData({
            color_h: 'red',
          })
          //              that.humidityAlarm()
        }
        if (that.data.LightLux >= 550) {
          that.setData({
            color_l: 'red',
          })
          //               that.lightAlarm()
        }
        if (that.data.co2 >= 60) {
          that.setData({
            color_c: 'red',
          })
          //                that.co2Alarm()
        }
        if (that.data.pm2_5 >= 100) {
          that.setData({
            color_p: 'red',
          })
          //               that.PM25Alarm()
        }
        if (that.data.SoundDecibelValue >= 300) {
          that.setData({
            color_s: 'red',
          })
          //                that.soundAlarm()
        }
        that.setData({
          alarm: !that.data.alarm
        })
      }
    }
  },

})