/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 */

const fs = require('fs')
const util = require('util')

/**
 * Gets tool configuration based on input from yargs interface
 *
 * @param {YargsInterface} cli - yargs cli
 * @returns {Object} - validated cli parameter setting
 */
module.exports = async (cli) => {
  let configuration = {
    path: cli.f,
    pattern: cli.p,
    timestamp: cli.t || 'exif',
    ignoreErrors: cli.i,
  }

  try {
    configuration.path = await validFolder(configuration.path)
    configuration.pattern = validPattern(configuration.pattern)
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
 * @param {string} pattern - checks if a string is a valid regex pattern
 * @returns {string} - regex selection pattern
 */
function validPattern(pattern) {
  try {
    return pattern ? new RegExp(pattern, 'i') : /^.+[.]jpg$/i
  } catch (error) {
    throw new InputError(`Input pattern [${pattern}] isn't valid regex`)
  }
}
