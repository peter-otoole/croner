# croner
Command line tool to chronologically order JPG files using their EXIF creation timestamp. Croner also allows ordering of any type of file based on their creation and update timestamps.

## Install

1. Install node.js 14 from here - https://nodejs.org/dist/v14.17.5/
2. Open a CLI window (Command Prompt on Windows, Terminal on Linux)
3. Enter the following:

```
npm i peter-otoole/croner -g
```
4. Use croner via the command line - see help by entering:

```
croner -h
```

## Help

``` batch
<croner -

Chronologically orders JPEG files in a folder based on their EXIF creation date.
New file names take the form YYYYMMDD_HHMMss.jpg

Usage: croner [options]

Examples:
- croner
- croner -f ./pictures/ -p IMG_*.jpg -i

Options:
      --version         Show version number                            [boolean]
  -f, --folder          the folder location of the files to be sorted, defaults
                        to current directory                            [string]
  -p, --pattern         glob filename pattern to match, defaults to '**/*.jpg'.
                        NOTE: always case insensitive                   [string]
  -i, --ignoreErrors    ignore errors that occur while reading exif data (skips
                        file)                                          [boolean]
  -t, --timestamp       select which timestamp to order files by
                       [choices: "exif", "atime", "ctime", "mtime", "birthtime"]
  -v, --verboseLogging  set logging level to info,debug,trace,warn,error
                        (default to info, '' means debug)               [string]
  -h, --help            Show help                                      [boolean]
```

## Testing

Currently, croner does not have any unit tests. All tests are manual and all edge cases are not covered. If any issues are found, please report them by filing a bug.

## Support

Currently, croner functions on both Windows and Linux OS, however, the majority of testing was done on Windows. If you notice any compatibilities issues, please report them by filing a bug.

## Warnings

It is advisable to create a backup of pictures before running croner in case of any non-reversible changes.

## License

See license.txt (https://github.com/peter-otoole/croner/blob/master/license.txt)