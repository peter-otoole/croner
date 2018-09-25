/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 */

const ExifImage = require('exif').ExifImage
const utils = require('./utils')
const async = require('async')
const path = require('path')
const moment = require('moment')
const fs = require('fs')
const log = utils.log
const util = require('util')

const read_limit = 5
const rename_limit = 30

/**
 * Reads the information of all files in the chosen folder.
 * Orders the files in an array based on their timestamp information.
 * Renames files to this order by pre-pending a 6 digit number.
 *
 * @param {boolean} ignoreErrors - whether script should ignore errors reading/writing file information
 * @param {string} timestampType - selected timestamp to order on ctime, mtime etc
 * @param {string} targetFolder - path to folder
 * @param {regex} pattern - pattern of files to include in order
 * @param {function} callback - callback function
 */
module.exports = async function(ignoreErrors, timestampType, targetFolder, pattern, callback) {
  log.info(`Start ordering files in '${targetFolder}'`)
  log.info(`Pattern is '${pattern.toString()}'`)

  try {
    const folderContents = await readFolder(targetFolder)
    const filteredContents = await filterFolderContentsByPattern(pattern, folderContents)
    const filteredContentsInfo = await readAllFilesFsInformation(targetFolder, filteredContents)
    const filteredFileInfo = await filterFolderContentsForFiles(filteredContentsInfo)
    const filteredFilesWithTimestamp = await readAllFilesTimestampInfo(ignoreErrors, timestampType,
        targetFolder, filteredFileInfo)
    const newFileNames = generateNewFileNames(filteredFilesWithTimestamp)
    writeOutNewFileNames(ignoreErrors, targetFolder, newFileNames)

    log.info('Successfully renamed all files')
    return callback()
  } catch (error) {
    log.error(`Failed setting new file names - ${error.message}`)
    log.error(error.stack)
    return callback(error)
  }
}

/**
 * Reads the contents of a target folder
 *
 * @param {string} targetFolder - target folder path
 * @returns {Promise}
 */
async function readFolder(targetFolder) {
  log.debug('Reading folder contents...')
  try {
    const folderContents = await util.promisify(fs.readdir)(targetFolder)
    log.debug(`Found ${folderContents.length} items`)
    return Promise.resolve(folderContents)
  } catch (error) {
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
function filterFolderContentsByPattern(pattern, folderContents) {
  const filteredContents = folderContents.filter((name) => {
    log.trace(`Looking at '${name}', pattern matching result is ${pattern.test(name)}`)
    return pattern.test(name)
  })

  if (filteredContents.length === 0) {
    return Promise.reject(new Error('No files found matching the pattern'))
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
async function readAllFilesFsInformation(targetFolder, filteredContents) {
  const tasks = filteredContents.map((fileName) => (callback) => {
    const filePath = path.join(targetFolder, fileName)

    fs.stat(filePath, (error, stats) => {
      if (error) {
        return callback(new Error(`Failed reading file (${filePath}) information - ${error.message}`))
      }

      const file = {name: fileName, stats, isDirectory: stats.isDirectory()}
      log.trace(`File information \n ${JSON.stringify(file)}`)
      return callback(null, file)
    })
  })

  log.debug('Getting details for each item...')
  return util.promisify(async.parallelLimit)(tasks, read_limit)
}

/**
 * Looks at each item in the folder and check the stats results, filtering out folders
 *
 * @param {Array} folderContents - array of folder content objects containing file name and stats
 * @returns {Promise} - to filter all contents down to just files
 */
function filterFolderContentsForFiles(folderContents) {
  const folderFiles = folderContents.filter((item) => !item.directory)

  if (folderFiles.length === 0) {
    return Promise.reject(new Error('No files found matching the regex - pattern'), null)
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
async function readAllFilesTimestampInfo(ignoreErrors, timestampType, targetFolder, files) {
  if (timestampType !== 'exif') {
    log.info('Skipping loading of Exif information')
    files.forEach((file) => file.timestamp = moment(file.stats[timestampType]))
    return Promise.resolve(files)
  }

  const tasks = files.map((file, position) => (callback) => {
    const filePath = path.join(targetFolder, file.name)

    log.trace(`Reading exif data of file '${file.name}' (${position+1} of ${files.length})`)
    new ExifImage({image: filePath}, (error, exifData) => {
      if (error) {
        error = new Error(`Failed reading file (${filePath}) Exif information - ${error.message}`)
        log.error(`Error when reading exif data for file '${file.name}' (${position + 1} of ${files.length}) - '${error}'`)
        return callback(null, {error})
      }

      file.exif = exifData
      file.exifTimestamp = file.exif.exif.DateTimeOriginal
      file.timestamp = utils.parseExifDate(file.exif.exif.DateTimeOriginal)

      return callback(null, {file})
    })
  })

  log.debug('Getting file exif information...')
  try {
    const results = await util.promisify(async.parallelLimit)(tasks, read_limit)
    const successes = results.filter((r) => r.file).map((r) => r.file)
    const failures = results.filter((r) => r.error).map((r) => r.error)

    if (failures.length === 0) {
      log.debug('Loaded EXIF information for all files')
      return Promise.resolve(successes)
    }

    if (ignoreErrors) {
      log.warn(`Failed to get exif information for ${failures.length} of ${results.length} files. Ignoring errors`)
      return Promise.resolve(successes)
    }

    let error = new Error(`Failed to get exif information for ${failures.length} of ${results.length} files`)
    return Promise.reject(error)
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Uses selected timestamp to generate a new file name of each file
 *
 * @param {Array} files - array of files
 * @returns {Array} - array of file objects with current and new file name properties
 */
function generateNewFileNames(files) {
  const newFiles = []
  files.forEach((f) => {
    f.newFileName = f.timestamp.format('YYYYMMDD_HHmmss')

    const filesWithSameNewName = newFiles.filter((file) => file.newFileName.slice(0, 15) == f.newFileName.slice(0, 15))
    if (filesWithSameNewName.length > 0) {
      f.newFileName += `_${filesWithSameNewName.length}`
    }

    f.newFileName += f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
    newFiles.push(f)
  })

  return newFiles
}

/**
 * Writes out new file names to input files
 *
 * @param {boolean} ignoreErrors - whether or not to ignore errors when reading file timestamps
 * @param {string} targetFolder - path to target folder
 * @param {Array} files - array of files with new file name
 * @returns {Promise} - to write
 */
function writeOutNewFileNames(ignoreErrors, targetFolder, files) {
  const tasks = files.map((file, position) => (callback) => {
    const oldFilePath = path.join(targetFolder, file.name)
    const newFilePath = path.join(targetFolder, file.newFileName)

    log.trace(`Renaming '${oldFilePath}' to '${newFilePath}' (${position + 1} of ${files.length})`)
    fs.rename(oldFilePath, newFilePath, (error) => {
      if (error) {
        if (ignoreErrors) {
          log.warn(`Failed renaming '${oldFilePath}' to '${newFilePath}' (${position + 1} of ${files.length}) due to error - ${error.message}`)
          return callback()
        }

        return callback(new Error(`Failed to rename file '${oldFilePath}' to '${newFilePath}' - ${error.message}`))
      }

      return callback()
    })
  })

  log.debug('Renaming files to be in chronological order...')
  try {
    return util.promisify(async.parallelLimit)(tasks, rename_limit)
  } catch (error) {
    return Promise.reject(new Error(`Failed naming a file - ${error.message}`))
  }
}
