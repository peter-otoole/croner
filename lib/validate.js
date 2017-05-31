/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 28 May 2017
 */

const utils = require("./utils")
const fs = require("fs")

module.exports = function(cli) {

    let configuration = {
        path: cli.f,
        pattern: cli.p,
        selectedTimestamp: cli.t || "ctime"
    }

    configuration.path = validFolder(configuration.path)
    configuration.pattern = validPattern(configuration.pattern)

    return configuration
}

/**
 * Throws an InputError if the path is not to a valid existing directory.
 * 
 * @param {string} path - input path, should be a directory 
 * @returns {string} - input path, readable by node
 */
function validFolder(path) {

    path = path.replace(/([\\])/g, "/")
    let stats

    try {
        stats = fs.lstatSync(path)
    } catch (error) {
        throw InputError(`Folder [${path}] doesn't exist or is not accessable`)
    }

    if (!stats.isDirectory()) {
        throw InputError(`[${path}] is not a folder`)
    }

    return path
}

/**
 * 
 * 
 * @param {string} pattern 
 * @returns {string} - regex selection pattern
 */
function validPattern(pattern) {

    pattern = new RegExp(pattern) || /^.+$/

    return pattern
}