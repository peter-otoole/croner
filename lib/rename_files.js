/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 */

const ExifImage = require("exif").ExifImage
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
 * Renames files to this order by pre-pending a 6 digit number.
 *
 * @param {string} path - path to folder
 * @param {regex} pattern - pattern of files to include in order
 * @param {string} selectedTimestamp - selected timestamp to order on ctime, mtime etc
 * @param {function(null|Error,{}|null)} callback - callback function
 */
module.exports = function (ignoreErrors, timestampType, path, pattern, callback) {
    log.info(`Start ordering files in '${path}'`)
    log.info(`Pattern is '${pattern.toString()}'`)

    const tasks = [
        readFolder.bind(null, path),
        filterPatternName.bind(null, pattern),
        readFileInformation.bind(null, path),
        selectFilesOnly,
        readTimestampInformation.bind(null, ignoreErrors, timestampType, path),
        parseOriginalDateTime.bind(null, timestampType),
        writeOutNewFileNames.bind(null, path)
    ];

    async.waterfall(tasks, (error) => {
        if (error) {
            log.error(`Failed to order files - ${error.message}`)

            return callback(error)
        }

        log.info("Successfully renamed all files")

        return callback(null)
    })
}

function readFolder (folderPath, callback) {
    log.debug("Reading folder contents...")
    fs.readdir(folderPath, (error, contents) => {
        if (error) {
            error = new Error(`Failed reading folder contents - ${error.message}`)
        } else {
            log.debug(`Found ${contents.length} items`)
        }

        return callback(error, contents)
    })
}

function filterPatternName (pattern, contentNames, callback) {
    const filteredFiles = contentNames.filter((name) => {
        log.trace(`Looking at file named '${name}', pattern matching result is ${pattern.test(name)}`)

        return pattern.test(name)
    })

    if (filteredFiles.length === 0) {
        return callback(new Error("No files found matching the pattern"))
    }
    log.debug(`Found ${filteredFiles.length} items matching pattern`)

    return callback(null, filteredFiles)

}

function readFileInformation (folderPath, contentNames, callback) {
    const tasks = contentNames.map((fileName) => (callback) => {
        let filePath = path.join(folderPath, fileName)

        fs.stat(filePath, (error, stats) => {
            if (error) {
                error = new Error(`Failed reading file (${filePath}) information - ${error.message}`)

                return callback(error)
            }

            const result = {
                fileName,
                "fileInformation": stats,
                "directory": stats.isDirectory()
            }
            log.trace(`File information \n ${JSON.stringify(result, null, 4)}`)

            return callback(null, result)
        })
    })

    log.debug("Getting details for each item...")
    async.parallel(tasks, (error, results) => {
        if (error) {
            error = new Error(`Failed getting files' information - ${error.message}`)
        }

        return callback(error, results)
    })
}

function selectFilesOnly (folderContents, callback) {
    const files = folderContents.filter((item) => !item.directory)

    if (files.length === 0) {
        return callback(new Error("No files found matching the regex - pattern"), null)
    }
    log.debug(`Found ${files.length} files matching pattern`)

    return callback(null, files)

}

function readTimestampInformation (ignoreErrors, timestampType, folderPath, files, callback) {
    if (timestampType !== "exif") {
        log.info("Skipping loading of Exif information")

        return callback(null, files)
    }

    let tasks = files.map((file, position) => (callback) => {
        const filePath = path.join(folderPath, file.fileName)

        try {
            log.trace(`Reading exif data of file '${file.fileName}' (${position} of ${files.length})`)
            new ExifImage({"image": filePath}, (error, exifData) => {

                if (error) {
                    error = new Error(`Failed reading file (${filePath}) Exif information - ${error.message}`)
                    log.error(`Tried reading exif data for file '${file.fileName}' (${position + 1} of ${files.length}) but got error '${error}'`)

                    return callback(null, error)
                }

                file.exif = exifData
                file.exifTimestamp = file.exif.exif.DateTimeOriginal

                return callback(null, file)
            })
        } catch (error) {
            error = new Error(`Failed reading file (${filePath}) Exif information - ${error.message}`)
            log.error(`Error when reading exif data for file '${file.fileName}' (${position + 1} of ${files.length}) - '${error}'`)

            return callback(null, error)
        }
    })

    log.debug("Getting file exif information...")
    async.parallelLimit(tasks, read_limit, (error, results) => {
        if (ignoreErrors) {
            const successes = results.filter((result) => !(result instanceof Error))

            return callback(error, successes)
        }

        let errors = results.filter((result) => result instanceof Error)

        if (errors.length > 0) {
            error = new Error(`Failed getting ${errors.length} files' exif information`)
        }

        return callback(error, results)
    })
}

function parseOriginalDateTime (timestampType, files, callback) {
    let currentFile, timestamp

    try {
        files.forEach((file) => {
            currentFile = file

            if (timestampType === "exif") {
                timestamp = currentFile.exif.exif.DateTimeOriginal
                file.cronerTimeStamp = utils.parseExifDate(timestamp)
            } else {
                timestamp = currentFile.fileInformation[timestampType]
                file.cronerTimeStamp = moment(timestamp)
            }
        })

        return callback(null, files)
    } catch (error) {
        log.debug(`Failed parsing date due to error '${error}'`)
        error = new Error(`Failed parsing exif date '${timestamp}' for file '${currentFile.fileName}'`)

        return callback(error)
    }
}

function writeOutNewFileNames (folderPath, files, callback) {
    const tasks = files.map((file, position) => (callback) => {
        const filePath = path.join(folderPath, file.fileName)
        const fileDateTime = file.cronerTimeStamp.format("YYYYMMDD_HHmmss")
        const newFileName = `${fileDateTime}${file.fileName.slice(file.fileName.lastIndexOf("."))}`
        const newFilePath = path.join(folderPath, newFileName)

        log.trace(`Renaming '${file.fileName}' to '${newFileName}' (${position + 1} of ${files.length})`)
        fs.rename(filePath, newFilePath, (error) => {
            if (error) {
                error = new Error(`Failed to rename file "${filePath}" to "${newFilePath}" - ${error.message}`)
            }

            return callback(error)
        })
    })

    log.debug("Renaming files to be in chronological order...")
    async.parallelLimit(tasks, rename_limit, (error) => {
        if (error) {
            error = new Error(`Failed naming a file - ${error.message}`)
        }

        return callback(error)
    })
}