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
const moment = require("moment")
const fs = require("fs")
const log = utils.log

const read_limit = 5
const rename_limit = 30

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
module.exports = function(ignoreErrors, timestampType, path, pattern, callback) {

    log.info(`Start ordering files in '${path}'`)
    log.info(`Pattern is '${pattern.toString()}'`)

    async.waterfall([
        readFolder.bind(null, path),
        filterPatternName.bind(null, pattern),
        readFileInformation.bind(null, path),
        selectFilesOnly,
        readTimestampInformation.bind(null, ignoreErrors, timestampType, path),
        parseOriginalDateTime.bind( null, timestampType ),
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

                log.trace( `File information \n ${JSON.stringify( result, null, 4 )}` )

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

function readTimestampInformation(ignoreErrors, timestampType, folderPath, files, callback) {

     if( timestampType !== "exif" ){
        log.info( `Skipping loading of Exif information` )
        return callback( null, files )
     }

    let tasks = files.map( (file, possition) => {

        let filePath = path.join(folderPath, file.fileName)

        return function(callback) {
           
            try {

                log.trace( `Reading exif data of file '${file.fileName}' (${possition} of ${files.length})` )
                new ExifImage({ image: filePath }, function(error, exifData) {

                    if (error) {
                        error = new Error( `Failed reading file (${filePath}) Exif information - ${error.message}` )
                        log.error( `Tried reading exif data for file '${file.fileName}' (${possition} of ${files.length}) but got error '${error}'` )
                        return callback(null, error)
                    } else {

                        file.exif = exifData
                        file.exifTimestamp = file.exif.exif.DateTimeOriginal
                        return callback(null, file)
                    }
                })
            } catch (error) {
                error = new Error( `Failed reading file (${filePath}) Exif information - ${error.message}`)
                log.error( `Error when reading exif data for file '${file.fileName}' (${possition} of ${files.length}) - '${error}'` )
                return callback(null, error)
            }
        }
    })

    log.debug("Getting file exif information...")
    async.parallelLimit(tasks, read_limit, (error, results) => {

        if( ignoreErrors ) {
       
            let successes = results.filter( result => {
                return !(result instanceof Error)
            } )

            return callback(error, successes)
        }
        else {

            let errors = results.filter( result => {
                return result instanceof Error
            } )

            if (errors.length > 0) {
                error = new Error(`Failed getting ${errors.length} files' exif information`)
            }  

            return callback(error, results)
        }      
    })
}

function parseOriginalDateTime(timestampType, files, callback) {

    let currentFile, timestamp

    try{

        files.forEach(file => {
            currentFile = file

            if( timestampType === "exif" ) {
                
                timestamp = currentFile.exif.exif.DateTimeOriginal
                file.cronerTimeStamp = utils.parseExifDate(timestamp)
            } else {
                timestamp = currentFile.fileInformation[ timestampType ]
                file.cronerTimeStamp = moment(timestamp)
            }
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
        log.trace(file.fileName + " \t\t- " + file.cronerTimeStamp)
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
        log.trace(file.fileName + " \t\t- " + file.cronerTimeStamp)
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
            
            log.trace( `Giving file '${file.fileName}' (${possition} of ${files.length}) a temporary name` )
            fs.rename(filePath, tempPath, function(error) {

                if (error) {
                    error.messsage = `Failed to rename file "${filePath}" to "${tempPath}" - ${error.message}`
                }
                return callback(error)
            })
        }
    })

    async.parallelLimit(tasks, rename_limit, (error) => {

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

            log.trace( `Renaming '${file.fileName}' to '${newFileName}' (${possition} of ${files.length})` )
            fs.rename(filePath, newFileName, function(error) {

                if (error) {
                    error.messsage = `Failed to rename file "${filePath}" to "${newFileName}" - ${error.message}`
                }

                return callback(error)
            })
        }
    })

    log.debug("Renaming files to be in cronological order...")
    async.parallelLimit(tasks, rename_limit, (error) => {

        if (error) {
            error.messsage = `Failed naming a file - ${error.message}`
        }

        return callback(error)
    })
}