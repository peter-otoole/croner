/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 28 May 2017
 */

const utils = require("./utils")
const yargs = require("yargs")

const log = utils.log
const is = utils.is

module.exports = function() {

    const yargsInterface = getInterface()
    const cli = yargsInterface.argv

    return { interface: yargsInterface, cli: cli }
}

function getInterface() {

    return yargs.usage(`
 Chronologically orders JPEG files in a folder based on their EXIF creation date. New filenames take the form CR_YYYYMMDD_NNNNNN.jpg
                          
 Usage: ${utils.constants.tool_name} [options]

 Examples:
   - ${utils.constants.tool_name } -f C://pictures// -p ^img.+[.]jpg$
`).option("f", {
        alias: "folder",
        describe: "the folder location of the files to be sorted",
        type: "string",
        demand: true
    }).option("p", {
        alias: "pattern",
        describe: "filename pattern to match, defaults to '^.+[.]jpg$'. NOTE: always case insensitive",
        type: "string",
        demand: false
    }).option("i", {
        alias: "ignoreErrors",
        describe: "ignore errors that occur while reading exif data (skips file)",
        type: "boolean",
        demand: false
    }).option("t", {
        alias: "timestamp",
        describe: "select which timestamp to order files by",
        choices: [ "exif", "atime", "ctime", "mtime", "birthtime" ],
        demand: false
    }).option("v", {
        alias: "verboseLogging",
        describe: `set logging level to ${Object.keys( utils.log ).toString()} (default to info, '' means debug)`,
        type: "string",
        demand: false
    }).help("h").alias("h", "help")
}
