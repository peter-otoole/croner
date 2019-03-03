/**
 * @copyright 2019 Peter O'Toole
 * @author peter-otoole
 */
'use strict'

const ExifImage = require('exif').ExifImage
const utils = require('./utils')
const async = require('async')
const path = require('path')
const uuid = require('uuid').v4
const moment = require('moment')
const fs = require('fs')
const log = utils.log
const util = require('util')
const glob = require('glob')

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
 * @param {string} pattern - glob pattern of files to include in order
 * @param {function} callback - callback function
 */
module.exports = async function(ignoreErrors, timestampType, targetFolder, pattern) {
  log.info(`Start ordering files in '${targetFolder}' matching pattern '${pattern}' based on '${timestampType}'`)

  try {
    const fileNames = await getFileNames(targetFolder, pattern)
    const fileNamesInfo = await readAllFilesFsInformation(targetFolder, fileNames)
    const filteredFilesWithTimestamp = await readAllFilesTimestampInfo(ignoreErrors, timestampType, targetFolder, fileNamesInfo)
    const newFileNames = generateNewFileNames(filteredFilesWithTimestamp)
    const count = await writeOutNewFileNames(ignoreErrors, targetFolder, newFileNames)

    log.info(`Successfully renamed ${count} files`)
    return true
  } catch (error) {
    log.error(`Failed setting new file names - ${error.message}`)
    return false
  }
}

/**
 * Uses glob to read files matching a glob pattern from a starting directory
 *
 * @param {string} directory - base starting directory
 * @param {string} pattern - valid glob pattern
 * @returns {Promise}
 */
async function getFileNames(directory, pattern) {
  log.debug('Searching for files in the given directory matching the glob...')

  const options = {
    cwd: directory,
    nocase: true,
  }

  const files = await util.promisify(glob)(pattern, options)
  if (files.length === 0) {
    return Promise.reject(new Error('No files found matching the glob pattern'), null)
  }

  log.debug(`Found ${files.length} files matching glob pattern`)
  return files
}

/**
 * Reads the file system information of each file
 *
 * @param {string} targetFolder - path to the target folder
 * @param {Array} fileNames - filenames retrieved from glob search
 * @returns {Promise} - Promise to get all file information
 */
async function readAllFilesFsInformation(targetFolder, fileNames) {
  const tasks = fileNames.map((fileName) => (callback) => {
    const filePath = path.join(targetFolder, fileName)

    fs.stat(filePath, (error, stats) => {
      if (error) {
        return callback(new Error(`Failed reading file (${filePath}) information - ${error.message}`))
      }

      const file = {name: fileName, stats}
      log.trace(`File information \n ${JSON.stringify(file)}`)
      return callback(null, file)
    })
  })

  log.debug('Getting details for each item...')
  return util.promisify(async.parallelLimit)(tasks, read_limit)
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
    log.debug(`Skipping loading of EXIF information because timestamp is set to '${timestampType}'`)
    // eslint-disable-next-line security/detect-object-injection
    files.forEach((file) => file.timestamp = moment(file.stats[timestampType]))
    return Promise.resolve(files)
  }

  const tasks = files.map((file, position) => (callback) => {
    const filePath = path.join(targetFolder, file.name)

    log.trace(`Reading EXIF data of file '${file.name}' (${position+1} of ${files.length})`)
    new ExifImage({image: filePath}, (error, exifData) => {
      if (error) {
        error = new Error(`Failed reading file (${filePath}) EXIF information - ${error.message}`)
        log.warn(`Failed reading EXIF data for file '${file.name}' (${position + 1} of ${files.length}) - '${error.message}'`)
        return callback(null, {error})
      }

      if (!exifData || !exifData.exif || !exifData.exif.DateTimeOriginal) {
        error = new Error(`Failed reading file (${filePath}) EXIF information; timestamp was null`)
        log.warn(`Failed reading EXIF data for file (${position + 1} of ${files.length}) - '${error.message}'`)
        return callback(null, {error})
      }

      file.exif = exifData
      file.exifTimestamp = file.exif.exif.DateTimeOriginal
      file.timestamp = utils.parseExifDate(file.exif.exif.DateTimeOriginal)

      return callback(null, {file})
    })
  })

  log.debug('Getting file EXIF information...')
  try {
    const results = await util.promisify(async.parallelLimit)(tasks, read_limit)
    const successes = results.filter((r) => r.file).map((r) => r.file)
    const failures = results.filter((r) => r.error).map((r) => r.error)

    if (failures.length === 0) {
      log.debug('Loaded EXIF information for all files')
      return Promise.resolve(successes)
    }

    if (ignoreErrors) {
      log.warn(`Failed getting EXIF information for ${failures.length} of ${results.length} files - '-i' flag was set, ignoring these errors`)
      return Promise.resolve(successes)
    }

    return Promise.reject(new Error(`Failed getting EXIF information for ${failures.length} of ${results.length} files`
      +` - run tool again with '-i' to ignore these errors`))
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
    const fileBasePath = path.parse(f.name).dir

    f.temporaryName = path.join(fileBasePath, uuid())
    f.newFileName = path.join(fileBasePath, f.timestamp.format('YYYYMMDD_HHmmss'))

    const filesWithSameNewName = newFiles.filter((file) => {
      return path.parse(file.newFileName).name.slice(0, 15) === path.parse(f.newFileName).name.slice(0, 15)
    })

    if (filesWithSameNewName.length > 0) {
      f.newFileName += `_${filesWithSameNewName.length}`
    }

    f.temporaryName += f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
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
async function writeOutNewFileNames(ignoreErrors, targetFolder, files) {
  const giveTempName = files.map((file, position) => (callback) => {
    const oldFilePath = path.join(targetFolder, file.name)
    const tempFilePath = path.join(targetFolder, file.temporaryName)

    log.trace(`Renaming '${oldFilePath}' to '${tempFilePath}' (${position + 1} of ${files.length})`)
    renameFile(ignoreErrors, files.length, position, oldFilePath, tempFilePath, callback)
  })

  const givePermanentNames = files.map((file, position) => (callback) => {
    const tempFilePath = path.join(targetFolder, file.temporaryName)
    const newFilePath = path.join(targetFolder, file.newFileName)

    log.trace(`Renaming '${tempFilePath}' to '${newFilePath}' (${position + 1} of ${files.length})`)
    renameFile(ignoreErrors, files.length, position, tempFilePath, newFilePath, callback)
  })

  log.debug('Renaming files to be in chronological order...')
  try {
    await util.promisify(async.parallelLimit)(giveTempName, rename_limit)
    await util.promisify(async.parallelLimit)(givePermanentNames, rename_limit)
    return files.length
  } catch (error) {
    return Promise.reject(new Error(`Failed naming a file - ${error.message}`))
  }
}

/**
 * Uses fs to rename a file from an old name to a new one
 *
 * @param {bool} ignoreErrors
 * @param {number} length
 * @param {number} position
 * @param {string} oldFileName
 * @param {string} newFileName
 * @param {function} callback
 */
function renameFile(ignoreErrors, length, position, oldFileName, newFileName, callback) {
  fs.rename(oldFileName, newFileName, (error) => {
    if (error) {
      if (ignoreErrors) {
        log.warn(`Failed renaming '${oldFilePath}' to '${newFilePath}' (${position + 1} of ${length}) due to error - ${error.message}`)
        return callback()
      }
      return callback(new Error(`Failed to rename file '${oldFilePath}' to '${newFilePath}' - ${error.message}`))
    }
    return callback()
  })
}
