/**
 * @copyright 2018 Peter O'Toole.
 * @author peter-otoole
 */

const utils = require("./lib/utils")
const helpers = require("./lib/helpers")
const log = utils.log

// Create exception handler
const handleUncaughtExceptions = require("./lib/uncaught_exception_handler")
handleUncaughtExceptions.attachListener(utils.constants.tool_name)

// Create interface
const interface = require("./lib/interface")()
const cli = interface.cli

// Set CLI interface for the exception handler and add the logging level
handleUncaughtExceptions.attachCli(interface.interface)
utils.setLoggingLevel(cli.v)

// Print start
helpers.printStart()

// Validate input parameters
const validate = require("./lib/validate")
let configuration = validate(cli)

// Call main code to rename files in selected folder
const rename_files = require("./lib/rename_files")
rename_files(configuration.ignoreErrors, configuration.timestamp, configuration.path, configuration.pattern, (error, result) => {

    log.info("Finished renaming files")

    // Print end
    helpers.printEnd()
});