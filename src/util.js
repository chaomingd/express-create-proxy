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
const boundaryReg = /boundary=([\s\S]*)/
function getBoundaryFromContentType(contentType) {
  return boundaryReg.exec(contentType)[1]
}

const trimReg = /^\s+|\s+$/g
function trim(str) {
  return str.replace(trimReg, '')
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

module.exports = {
  upperFirstCase,
  generateRule,
  urlNormalize,
  isObject,
  isBuf,
  isStream,
  getBoundaryFromContentType,
  trim,
  stripBOM
}