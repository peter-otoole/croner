/**
 * @copyright 2019 Peter O'Toole
 * @author peter-otoole
 */
'use strict'

const utils = require('./lib/utils')
const helpers = require('./lib/helpers')
const renameFiles = require('./lib/rename_files')
const handleUncaughtExceptions = require('./lib/uncaught_exception_handler')
const validate = require('./lib/validate')
const log = utils.log

/**
 * Sets up exception handler and instantiates CLI
 * Runs validation on input parameters and runs main logic
 */
async function main() {
  // Print start
  helpers.printStart()

  // Create exception handler
  handleUncaughtExceptions.attachListener(utils.constants.tool_name)

  // Create interface
  const toolInterface = require('./lib/interface')()
  const cli = toolInterface.cli

  // Set CLI interface for the exception handler and add the logging level
  handleUncaughtExceptions.attachCli(toolInterface.interface)
  utils.setLoggingLevel(cli.v)

  try {
    // Validate input parameters
    const configuration = await validate(cli)

    // Call main code to rename files in selected folder
    const exitCode = await renameFiles(configuration.ignoreErrors, configuration.timestamp,
        configuration.path, configuration.pattern) ? 0 : 1

    end(exitCode)
  } catch (error) {
    log.error(error)
    end(1)
  }
}

/**
 * Prints end and exits application
 *
 * @param {number} code
 */
function end(code) {
  helpers.printEnd()
  process.exit(code)
}

module.exports = main
