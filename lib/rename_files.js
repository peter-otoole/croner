/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 31 May 2017
 */

const utils = require("./utils")
const async = require("async")
const fs = require("fs")
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
    log.info(`Pattern is '${pattern}', time choice is '${selectedTimestamp}'`)

    async.waterfall([
        readFolder.bind(null, path),
        readFileInformation.bind(null, path)
    ], (error, results) => {

        console.log(error)
        console.log(results)

        return callback(null, null)
    })
}

function readFolder(folderPath, callback) {

    fs.readdir(folderPath, callback)
}

function readFileInformation(folderPath, fileNames, callback) {

    let tasks = fileNames.map(fileName => {

        let filePath = folderPath + '/' + fileName;
        return function(callback) {
            fs.stat(filePath, function(error, stats) {
                callback(error, { fileName: fileName, fileInformation: stats, directory: stats.isDirectory() })
            })
        }
    })

    async.parallel(tasks, (error, resutls) => {

        callback(error, resutls)
    })
}