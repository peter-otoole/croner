# croner
Command line tool to chronologically order JPG files in a folder using their EXIF creation timestamp. Croner also allows order of any type of file based on their creation and update timestamps.

## Install

1. Install node.js from here - https://nodejs.org/dist/v9.2.0/
2. Open Command Prompt
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
> croner -h

 Chronologically orders JPEG files in a folder based on their EXIF creation
 date. New filenames take the form YYYYMMDD_HHMMss.jpg

 Usage: croner [options]

 Examples:
   - croner -f ./pictures/ -p ^img.+[.]jpg$


Options:
  --version             Show version number                            [boolean]
  -f, --folder          the folder location of the files to be sorted
                                                             [string] [required]
  -p, --pattern         filename pattern to match, defaults to '^.+[.]jpg$'.
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

Currently, croner does not have any unit tests. All tests are manual and all edge cases are not covered. If any issues are found, please report them.

## Support

Currently, croner is only supported on Windows OS. Linux support is planned.

## Warnings

It is advisable to create a backup of pictures before running croner in case of any non-reversible changes.

## License

See license.txt (https://github.com/peter-otoole/croner/blob/master/license.txt)