/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 31 May 2017
 */

const utils = require("./utils")
const log = utils.log

/**
 * Reads the information of all files in the chosen folder. 
 * Orders the files in an array based on their timestamp information. 
 * Renames files to this order by prepending a 6 digit number.
 * 
 * @param {string} path - path to folder 
 * @param {regex} pattern - pattern of files to include in order
 * @param {string} selectedTimestamp - selected timestamp to order on ctime, mtime etc
 * @param {function( null || Error, {} || null )} callback - callback function
 */
module.exports = function(path, pattern, selectedTimestamp, callback) {

    log.info(`Start ordering files in '${path}'`)

    return callback(null, null)
}