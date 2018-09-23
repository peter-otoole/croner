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
const util = require("util")

const read_limit = 5
const rename_limit = 30

/**
 * Reads the information of all files in the chosen folder.
 * Orders the files in an array based on their timestamp information.
 * Renames files to this order by pre-pending a 6 digit number.
 *
 * @param {string} targetFolder - path to folder
 * @param {regex} pattern - pattern of files to include in order
 * @param {string} selectedTimestamp - selected timestamp to order on ctime, mtime etc
 * @param {function(null|Error,{}|null)} callback - callback function
 */
module.exports = async function (ignoreErrors, timestampType, targetFolder, pattern, callback) {
    log.info(`Start ordering files in '${targetFolder}'`)
    log.info(`Pattern is '${pattern.toString()}'`)

    try {
        const folderContents = await readFolder(targetFolder)
        const filteredContents = await filterFolderContentsByPattern(pattern, folderContents)
        const filteredContentsInfo = await readAllFilesFsInformation(targetFolder, filteredContents)
        const filteredFileInfo = await filterFolderContentsForFiles(filteredContentsInfo)


        log.info("Successfully renamed all files")
        return callback()
    }
    catch (error) {
        log.error(`Failed setting new file names - ${error.message}`)
        return callback(error)
    }
}

/**
 * Reads the contents of a target folder
 *
 * @param {string} targetFolder - target folder path
 * @returns {Promise}
 */
async function readFolder (targetFolder) {
    log.debug("Reading folder contents...")
    try {
        const folderContents = await util.promisify(fs.readdir)(targetFolder)
        log.debug(`Found ${folderContents.length} items`)
        return Promise.resolve(folderContents)
    }
    catch(error){
        return Promise.reject(new Error(`Failed reading folder contents - ${error.message}`))
    }
}

/**
 * Filters folder contents for files matching user specified pattern
 *
 * @param {Regex} pattern - file filtering pattern
 * @param {Array} folderContents - array of items in folder
 * @returns {Promise}
 */
async function filterFolderContentsByPattern (pattern, folderContents) {
    const filteredContents = folderContents.filter((name) => {
        log.trace(`Looking at '${name}', pattern matching result is ${pattern.test(name)}`)
        return pattern.test(name)
    })

    if (filteredContents.length === 0) {
        return Promise.reject(new Error("No files found matching the pattern"))
    }

    log.debug(`Found ${filteredContents.length} items matching pattern`)
    return Promise.resolve(filteredContents)
}

/**
 * Reads the file system information of each item in the target folder
 *
 * @param {string} targetFolder - path to the target folder
 * @param {Array} filteredContents - list of filtered (by user pattern) folder contents
 * @returns {Promise} - Promise to get all file info
 */
async function readAllFilesFsInformation (targetFolder, filteredContents) {
    const tasks = filteredContents.map((fileName) => {
        const filePath = path.join(targetFolder, fileName)

        try {
            const stats = await util.promisify(fs.stat)(filePath)
            const file = { name: fileName, stats, isDirectory: stats.isDirectory()}
            log.trace(`File information \n ${JSON.stringify(file, null, 4)}`)
            return Promise.resolve(file)
        } catch (error) {
            return Promise.reject(new Error(`Failed reading file (${filePath}) information - ${error.message}`))
        }
    })

    log.debug("Getting details for each item...")
    return await Promise.all(tasks)
}

/**
 * Looks at each item in the folder and check the stats results, filtering out folders
 *
 * @param {Array} folderContents - array of folder content objects containing file name and stats
 * @returns {Promise} - to filter all contents down to just files
 */
function filterFolderContentsForFiles (folderContents) {
    const folderFiles = folderContents.filter((item) => !item.directory)

    if (folderFiles.length === 0) {
        return Promise.reject(new Error("No files found matching the regex - pattern"), null)
    }

    log.debug(`Found ${folderFiles.length} files matching pattern`)
    return Promise.resolve(folderFiles)
}
/**
 * Pulls out the user specified timestamp from each of the files
 * 
 * @param {boolean} ignoreErrors - whether or not to ignore errors when reading file timestamps 
 * @param {string} timestampType - specifies which timestamp to read
 * @param {string} targetFolder - path to target folder
 * @param {Array} files - array of file names and stats
 * @returns {Promise} - to get the timestamp info for each file
 */
function readAllFilesTimestampInfo (ignoreErrors, timestampType, targetFolder, files) {
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