/**
 * Copyright 2017 Peter O'Toole.
 *
 * @author peter-otoole
 * @created 28 May 2017
 */

const utils = require( "./lib/utils" )

// Create exception handler 
const handleUncaughtExceptions = require( "./lib/uncaught_exception_handler" )
handleUncaughtExceptions.attachListener( utils.constants.too_name )

// Create interface
const interface = require( "./interface" )()
const cli = interface.cli

// Set CLI interface for the exception handler and add the logging level
handleUncaughtExceptions.attachCli( interface.interface )
utils.setLoggingLevel( cli.v )

// Validate input parameters
const validate = require( "./lib/validate" )
let configuration = validate( cli )

// Call main code to rename files in selected folder
const rename_files = require( "./lib/rename_files" )
rename_files( configuration.path, configuration.pattern, configuration.selectedTimestamp )
