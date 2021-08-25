/**
 * @copyright 2019 Peter O'Toole
 * @author peter-otoole
 */
'use strict'

const isValidGlob = require('is-valid-glob')
const util = require('util')
const fs = require('fs')
const is = require('is')
const { InputError } = require('./utils.js')

/**
 * Gets tool configuration based on input from yargs interface
 *
 * @param {YargsInterface} cli - yargs cli
 * @returns {Object} - validated cli parameter setting
 */
module.exports = async (cli) => {
  const configuration = {
    path: is.string(cli.f) && cli.f ? cli.f : process.cwd(),
    pattern: is.string(cli.p) && cli.p ? cli.p : '**/*.jpg',
    timestamp: is.string(cli.t) && cli.t ? cli.t : 'exif',
    ignoreErrors: cli.i
  }

  try {
    configuration.path = await validFolder(configuration.path)
    configuration.pattern = validGlobPattern(configuration.pattern)
    return configuration
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Throws an InputError if the path is not to a valid existing directory.
 *
 * @param {string} path - input path, should be a directory
 * @returns {string} - input path, readable by node
 */
async function validFolder(path) {
  path = path.replace(/([\\])/g, '/')
  let stats

  try {
    stats = await util.promisify(fs.lstat)(path)
  } catch (error) {
    throw new InputError(`Folder [${path}] doesn't exist or is not accessible`)
  }

  if (!stats.isDirectory()) {
    throw new InputError(`[${path}] is not a folder`)
  }

  return path
}

/**
 * Checks if a string is a valid glob pattern
 *
 * @param {string} inputPattern - input glob pattern
 * @returns {string} - glob selection pattern
 */
function validGlobPattern(inputPattern) {
  if (!isValidGlob(inputPattern)) {
    throw new InputError(`Input pattern [${inputPattern}] is not a valid glob`)
  }

  return inputPattern
}
