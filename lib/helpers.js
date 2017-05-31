/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 31 May 2017
 */

const utils = require("./utils")
const log = utils.log

/**
 * Prints the start of the program 
 */
exports.printStart = function() {

    console.log("\n*****************************************************")
    console.log("* Starting 'order files' tool...                    *")
    console.log("*****************************************************\n")
}

/**
 * Prints the end of the program 
 */
exports.printEnd = function() {

    console.log("\n*****************************************************")
    console.log("* Finished 'order files' tool...                    *")
    console.log("*****************************************************\n")
}