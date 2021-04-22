// pages/postdata/postdata.js
const app = getApp()
const iot = require("../../utils/aliIot-sdk.js")
const util = require('../../utils/util.js')
var mqtt = require('../../utils/mqtt.min.js')
const crypto = require('../../utils/hex_hmac_sha1.js')
var client

Page({

  /**
   * 页面的初始数据
   */
  data: {
    temperature: '',
    humidity: '',
    pm2_5: '',
    co2: '',
    LightLux: '',
    SoundDecibelValue: '',
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

  //获取温度输入框中数据
  Changetemperature: function (e) {
    console.log(e)
    this.setData({
      temperature: parseFloat(e.detail.value)
    })
  },

  //获取湿度输入框中数据
  Changehumidity: function (e) {
    console.log(e)
    this.setData({
      humidity: parseFloat(e.detail.value)
    })
  },

  //获取光照输入框中数据
  ChangeLightLux: function (e) {
    console.log(e)
    this.setData({
      LightLux:parseFloat(e.detail.value)
    })
  },

  //获取二氧化碳输入框中数据
  Changeco2: function (e) {
    console.log(e)
    this.setData({
      co2: parseFloat(e.detail.value)
    })
  },

  //获取PM2.5输入框中数据
  Changepm2_5: function (e) {
    console.log(e)
    this.setData({
      pm2_5: parseFloat(e.detail.value)
    })
  },

  //获取噪声输入框中数据
  ChangeSoundDecibelValue: function (e) {
    console.log(e)
    this.setData({
      SoundDecibelValue: parseFloat(e.detail.value)
    })
  },

  //封装输入的数据成JSON格式
  PostData:function(){
    const payload={
      id:Date.now(),
      params:{
        temperature:this.data.temperature,
        humidity:this.data.humidity,
        LightLux:this.data.LightLux,
        co2:this.data.co2,
        pm2_5:this.data.pm2_5,
        SoundDecibelValue:this.data.SoundDecibelValue,
      },
      method:"thing.event.property.post"
    }
    return JSON.stringify(payload)
  },

  SubmitData:function(){
    //将当前页面设置的数据返回至上一个页面并传到IoT
    let jsondata=this.PostData()
    var pages=getCurrentPages()
    var prevPage=pages[pages.length-2]
    prevPage.PostJsonData(jsondata)
   wx.navigateBack({
      delta:1
    })
  },

  //生成随机数值并传到IoT
  RandomData:function(){
/*
    this.setData({
      temperature:parseFloat((Math.random()*100).toFixed(1)),
      humidity:parseFloat((Math.random()*100).toFixed(1)),
      LightLux:parseFloat((Math.random()*1000).toFixed(1)),
      co2:parseFloat((Math.random()*100).toFixed(2)),
      pm2_5:parseFloat((Math.random()*300).toFixed(2)),
      SoundDecibelValue:parseFloat((Math.random()*500).toFixed(1)),
    })
    let jsondata=this.PostData()*/
    var pages=getCurrentPages()
    var prevPage=pages[pages.length-2]
    //prevPage.PostJsonData(jsondata)
    prevPage.POSTRandnumber()
    wx.navigateBack({
      delta:1
    })
  },
  


})