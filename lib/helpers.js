/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 31 May 2017
 */

const utils = require("./utils")
const constants = utils.constants
const log = utils.log

/**
 * Prints the start of the program 
 */
exports.printStart = function() {

    console.log("\n*****************************************************")
    console.log(`* Starting ${constants.tool_name} tool...                    *`)
    console.log("*****************************************************\n")
}

/**
 * Prints the end of the program 
 */
exports.printEnd = function() {

    console.log("\n*****************************************************")
    console.log(`* Finished ${constants.tool_name} tool...                    *`)
    console.log("*****************************************************\n")
}