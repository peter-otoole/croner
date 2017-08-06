/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 31 May 2017
 */

const ExifImage = require('exif').ExifImage
const utils = require("./utils")
const async = require("async")
const path = require("path")
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
module.exports = function(path, pattern, callback) {

    log.info(`Start ordering files in '${path}'`)
    log.info(`Pattern is '${pattern.toString()}'`)

    async.waterfall([
        readFolder.bind(null, path),
        filterPatternName.bind(null, pattern),
        readFileInformation.bind(null, path),
        selectFilesOnly,
        readExifInformation.bind(null, path),
        parseOriginalDateTime,
        orderArrayOnTimestamp,
        printResults,
        temporarilyRenameFiles.bind(null, path),
        renameFiles.bind(null, path)
    ], (error, results) => {

        if (error) {
            log.error(`Failed to order files - ${error.message}`)
            return callback(error)
        }

        log.info("Successfully renamed all files")
        return callback(null, null)
    })
}

function readFolder(folderPath, callback) {

    log.debug("Reading folder contents...")
    fs.readdir(folderPath, (error, contents) => {

        if (error) {
            error.messsage = `Failed reading folder contents - ${error.message}`
        } else {
            log.debug(`Found ${contents.length} items`)
        }

        return callback(error, contents)
    })
}

function filterPatternName(pattern, contentNames, callback) {

    let filteredFiles = contentNames.filter(name => {
        log.trace(`Looking at file named '${name}', test result is ${pattern.test(name)}`)
        return pattern.test(name)
    })

    if (filteredFiles.length === 0) {
        return callback(new Error(`No files found matching the regex - pattern`), null)
    } else {
        log.debug(`Found ${filteredFiles.length} items matching pattern`)
        return callback(null, filteredFiles)
    }
}

function readFileInformation(folderPath, contentNames, callback) {

    let tasks = contentNames.map(fileName => {

        let filePath = folderPath + '/' + fileName;

        return function(callback) {

            fs.stat(filePath, function(error, stats) {

                let result = null

                if (error) {
                    error.messsage = `Failed reading file (${filePath}) information - ${error.message}`
                } else {
                    result = {
                        fileName: fileName,
                        fileInformation: stats,
                        directory: stats.isDirectory()
                    }
                }

                return callback(error, result)
            })
        }
    })

    log.debug("Getting details for each item...")
    async.parallel(tasks, (error, resutls) => {

        if (error) {
            error.messsage = `Failed getting a files information - ${error.message}`
        }

        return callback(error, resutls)
    })
}

function selectFilesOnly(folderContents, callback) {

    let files = folderContents.filter(item => {

        return !item.directory
    })

    if (files.length === 0) {
        return callback(new Error(`No files found matching the regex - pattern`), null)
    } else {
        log.debug(`Found ${files.length} files matching pattern`)
        return callback(null, files)
    }
}

function readExifInformation(folderPath, files, callback) {

    let tasks = files.map( (file, possition) => {

        let filePath = path.join(folderPath, file.fileName)

        return function(callback) {

            try {
                new ExifImage({ image: filePath }, function(error, exifData) {
                    
                    log.trace( `Reading file number ${possition} with name '${file.fileName}'${error? " with error.": "."}` )

                    if (error) {
                        error = new Error( `Failed reading file (${filePath}) Exif information - ${error.message}` )
                        return callback(error)
                    } else {

                        file.exif = exifData
                        return callback(null, file)
                    }
                })
            } catch (error) {
                error = new Error( `Failed reading file (${filePath}) Exif information - ${error.message}`)
                return callback(error)
            }
        }
    })

    log.debug("Getting file exif information...")
    async.parallel(tasks, (error, resutls) => {

        if (error) {
            error.messsage = `Failed getting a file's exif information - ${error.message}`
        }

        return callback(error, resutls)
    })
}

function parseOriginalDateTime(files, callback) {

    let currentFile, timestamp

    try{

        files.forEach(file => {
            currentFile = file
            timestamp = currentFile.exif.exif.DateTimeOriginal
            file.cronerTimeStamp = utils.parseExifDate(timestamp)
        })

        return callback(null, files)
    } catch( error ) {
        
        log.debug( `Failed parsing date due to error '${error}'` )
        error = new Error( `Failed parsing exif date '${timestamp}' for file '${currentFile.fileName}'` )
        return callback( error )
    }
}

function orderArrayOnTimestamp(files, callback) {

    log.trace(`files before sorting`)
    files.forEach(file => {
        log.trace(file.fileName + " \t\t- " + file.exif.exif.DateTimeOriginal + " - " + file.cronerTimeStamp)
    })

    log.debug(`Sorting files...`)

    files.sort((a, b) => {
        if (a.cronerTimeStamp > b.cronerTimeStamp) {
            return 1
        }
        if (a.cronerTimeStamp < b.cronerTimeStamp) {
            return -1
        }

        return 0
    })

    return callback(null, files)
}

function printResults(files, callback) {

    files.forEach(file => {
        log.trace(file.fileName + " \t\t- " + file.exif.exif.DateTimeOriginal + " - " + file.cronerTimeStamp)
    })

    return callback(null, files)
}

function temporarilyRenameFiles(folderPath, files, callback) {

    log.debug( "Giving files temporary names..." )

    let tasks = files.map((file, possition) => {

        let filePath = path.join(folderPath, file.fileName)
        let tempName = `CR_TEMP_FILE_${utils.uuid()}.jpg`
        let tempPath = path.join(folderPath, tempName)
        file.temporyName = tempName

        return function(callback) {
        
            fs.rename(filePath, tempPath, function(error) {

                if (error) {
                    error.messsage = `Failed to rename file "${filePath}" to "${tempPath}" - ${error.message}`
                }
                return callback(error)
            })
        }
    })

    async.parallel(tasks, (error) => {

        if (error) {
            error.messsage = `Failed naming a file - ${error.message}`
        }

        return callback(error, files)
    })

}

function renameFiles(folderPath, files, callback) {

    let tasks = files.map((file, possition) => {

        let filePath = path.join(folderPath, file.temporyName)
        let fileOrder = utils.leftPad((possition+1).toString(), 6, "0")
        let fileDate = file.cronerTimeStamp.format("YYYYMMDD")
        let newFileName = path.join(folderPath, `CR_${fileDate}_${fileOrder}.jpg`)

        return function(callback) {

            fs.rename(filePath, newFileName, function(error) {

                if (error) {
                    error.messsage = `Failed to rename file "${filePath}" to "${newFileName}" - ${error.message}`
                }

                return callback(error)
            })
        }
    })

    log.debug("Renaming files to be in cronological order...")
    async.parallel(tasks, (error) => {

        if (error) {
            error.messsage = `Failed naming a file - ${error.message}`
        }

        return callback(error)
    })
}