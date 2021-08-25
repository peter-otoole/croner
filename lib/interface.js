/**
 * @copyright 2019 Peter O'Toole
 * @author peter-otoole
 */
'use strict'

const utils = require('./utils')
const yargs = require('yargs')

/**
 * Creates tool yargs interface
 *
 * @returns {Object} - yargs interface and cli
 */
module.exports = () => {
  const yargsInterface = getInterface()
  const cli = yargsInterface.argv

  return { interface: yargsInterface, cli }
}

/**
 * Returns the tool's yargs interface
 *
 * @returns {YargsInterface} - yargs interface
 */
function getInterface() {
  const usage = `
Chronologically orders JPEG files in a folder based on their EXIF creation date. New file names take the form YYYYMMDD_HHMMss.jpg
 
Usage: ${utils.constants.tool_name} [options]
 
Examples:
  - ${utils.constants.tool_name}
  - ${utils.constants.tool_name} -f ./pictures/ -p IMG_*.jpg -i`

  return yargs.usage(usage).option('f', {
    alias: 'folder',
    describe: 'the folder location of the files to be sorted, defaults to current directory',
    type: 'string',
    demand: false
  }).option('p', {
    alias: 'pattern',
    describe: 'glob filename pattern to match, defaults to \'**/*.jpg\'. NOTE: always case insensitive',
    type: 'string',
    demand: false
  }).option('i', {
    alias: 'ignoreErrors',
    describe: 'ignore errors that occur while reading exif data (skips file)',
    type: 'boolean',
    demand: false
  }).option('t', {
    alias: 'timestamp',
    describe: 'select which timestamp to order files by',
    choices: ['exif', 'atime', 'ctime', 'mtime', 'birthtime'],
    demand: false
  }).option('v', {
    alias: 'verboseLogging',
    describe: `set logging level to ${Object.keys(utils.log).toString()} (default to info, '' means debug)`,
    type: 'string',
    demand: false
  }).help('h').alias('h', 'help')
}
