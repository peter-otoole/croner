/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 *
 * Utility functions
 */

const colors = require('colors')
const moment = require('moment')

global.InputError = (desc) => {
  let error = new Error(desc)
  error.name = 'InputError'

  return error
}

global.InternalError = (desc) => {
  let error = new Error(desc)
  error.name = 'InternalError'

  return error
}

/**
 * Logs the messages at the appropriate level
 *
 * @param {string} level - logging level
 * @returns {void}
 */
function log(level, ...messages) {
  const logging_level = process.env.logging_level
  let message = messages.join(' ')
  let outputString = `${level.toUpperCase()} ${new Date().toISOString()}: ${message}`

  if (level === 'trace' && logging_level === 'trace') {
    console.log(colors.magenta(outputString))
  } else if (level === 'debug' && (logging_level === 'debug' || logging_level === 'trace')) {
    console.log(colors.yellow(outputString))
  } else if (level === 'info' && (logging_level === 'info' || logging_level === 'debug' || logging_level === 'trace')) {
    console.log(colors.green(outputString))
  } else if (level === 'warning' && (logging_level === 'warning' || logging_level === 'info' || logging_level === 'debug' || logging_level === 'trace')) {
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
  error: log.bind(null, 'error'),
}

/**
 * Sets the logging level for the tool
 *
 * @param {string} levelParameter - new logging level
 * @returns {void}
 */
exports.setLoggingLevel = function(levelParameter) {
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

exports.constants = {
  tool_name: 'croner',
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
exports.parseExifDate = function(timestamp) {
  let date = moment(timestamp, 'YYYY:MM:DD HH:mm:ss')

  if (!date.isValid()) {
    date = moment(timestamp, 'YYYY/MM/DD HH:mm:ss')
    if (!date.isValid()) {
      throw new InternalError(`Found invalid exif date '${timestamp}', unable to parse`)
    }
  }

  return date
}
