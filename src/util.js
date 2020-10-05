const Stream = require('stream')
const firstLetterReg = /\b[a-z]/g
function upperFirstCase(str) {
  return str.replace(firstLetterReg, matchedStr => matchedStr.toUpperCase())
}

function generateRule (proxy) {
  const ruleCahes = []
  Object.keys(proxy).forEach(key => {
    ruleCahes.push({
      rule: new RegExp(key),
      value: proxy[key]
    })
  })
  return ruleCahes
}

const urlNormalReg = /(?<!https?\:)\/{2,}/g
function urlNormalize(url) {
  return url.replace(urlNormalReg, '/')
}

const OBJECTTYPE = '[object Object]'
const toString = Object.prototype.toString
function isObject(obj) {
  return toString.call(obj) === OBJECTTYPE
}

function isBuf(buf) {
  return Buffer.isBuffer(buf)
}

function isStream (stream) {
  return stream instanceof Stream
}
function getBoundaryFromContentType(contentType) {
  let contentTypes = contentType.split('; ')
  let boundary = contentTypes[1].split('=')[1]
  return boundary
}

const trimReg = /^\s+|\s+$/g
function trim(str) {
  return str.replace(trimReg, '')
}

module.exports = {
  upperFirstCase,
  generateRule,
  urlNormalize,
  isObject,
  isBuf,
  isStream,
  getBoundaryFromContentType,
  trim
}