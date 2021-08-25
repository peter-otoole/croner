/**
 * @copyright 2019 Peter O'Toole
 * @author peter-otoole
 *
 * Utility functions
 */
'use strict'

const colors = require('colors')
const moment = require('moment')

/**
 * Extension of error class for InputError type
 */
class InputError extends Error {
  /**
   * @param  {...any} args
   */
  constructor (...args) {
    super(...args)
    Error.captureStackTrace(this, this.constructor)
    this.name = 'InputError'
  }
}

/**
 * Extension of error class for InputError type
 */
class InternalError extends Error {
  /**
   * @param  {...any} args
   */
  constructor (...args) {
    super(...args)
    Error.captureStackTrace(this, this.constructor)
    this.name = 'InternalError'
  }
}

exports.InputError = InputError
exports.InternalError = InternalError
global.InputError = InputError
global.InternalError = InternalError

/**
 * Logs the messages at the appropriate level
 *
 * @param {string} level - logging level
 * @returns {void}
 */
function log (level, ...messages) {
  const loggingLevel = process.env.logging_level
  const message = messages.join(' ')
  const outputString = `${level.toUpperCase()}\t${new Date().toISOString()}: ${message}`

  if (level === 'trace' && loggingLevel === 'trace') {
    console.log(colors.magenta(outputString))
  } else if (level === 'debug' && (loggingLevel === 'debug' || loggingLevel === 'trace')) {
    console.log(colors.yellow(outputString))
  } else if (level === 'info' && (loggingLevel === 'info' || loggingLevel === 'debug' || loggingLevel === 'trace')) {
    console.log(colors.green(outputString))
  } else if (level === 'warning' && (loggingLevel === 'warning' || loggingLevel === 'info' || loggingLevel === 'debug' || loggingLevel === 'trace')) {
    console.error(`\u001b[93m${outputString}\u001b[39m`)
  } else if (level === 'error') {
    console.error(colors.red(outputString))
  }
}

exports.log = {
  info: log.bind(null, 'info'),
  debug: log.bind(null, 'debug'),
  trace: log.bind(null, 'trace'),
  warn: log.bind(null, 'warning'),
  error: log.bind(null, 'error')
}

/**
 * Sets the logging level for the tool
 *
 * @param {string} levelParameter - new logging level
 * @returns {void}
 */
exports.setLoggingLevel = function (levelParameter) {
  let level

  if (typeof levelParameter === 'undefined') {
    level = 'info'
  } else if (typeof levelParameter === 'string' && !levelParameter) {
    level = 'debug'
  } else if (!Object.prototype.hasOwnProperty.call(exports.log, levelParameter)) {
    throw new Error(`'${levelParameter}' is not a valid logging level - please choose one of ${Object.keys(exports.log).toString()}`)
  } else {
    level = levelParameter
  }

  process.env.logging_level = level
}

exports.isVerbose = () => {
  return process.env.logging_level === 'debug' || process.env.logging_level === 'trace'
}

exports.constants = {
  tool_name: 'croner'
}

/**
 * Takes a object and a path to a sub-properties and pulls out the property value
 *
 * @param {string} path - path to value to property
 * @param {Object} value - object of which to look up the property
 * @returns {*} - value of property
 */
exports.findValue = (path, value) => {
  path = path.split('.')

  try {
    path.forEach((subField) => {
      value = value[subField]
    })
  } catch (error) {
    return null
  }

  return value
}

/**
 * Expect timestamp in the form "2017:05:06 13:21:02"
 *
 * @param {string} timestamp - timestamp formatted in exif format
 * @returns {Moment} - momentJs representation of the timestamp
 */
exports.parseExifDate = function (timestamp) {
  let date = moment(timestamp, 'YYYY:MM:DD HH:mm:ss')

  if (!date.isValid()) {
    date = moment(timestamp, 'YYYY/MM/DD HH:mm:ss')
    if (!date.isValid()) {
      throw new InternalError(`Found invalid exif date '${timestamp}', unable to parse`)
    }
  }

  return date
}
