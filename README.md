# sourcery

A command-line utility that spins up a Chromium browser window and parses URLs, domains, and endpoints from source files and other response payloads.

## Why?

Source files (e.g. JavaScript-s) often contain information about subdomains and endpoints that's difficult to discover via other enumeration/brute-forcing methods. A single webpage may require dozens of scripts, each containing tens of thousands of lines of code. There are existing tools to crawl sites and parse endpoints from these large files, but these tools aren't always free or easy to integrate with existing workflows.

If you're a bug-bounty hunter or web security researcher, chances are you're spending a lot of time in the browser. While you navigate around a web application and test different functionality,`sourcery` parses URLs, domains, and endpoints from all the files and response payloads it sees. It writes this information to a directory you specify.

## Install

`npm i @zbo14/sourcery`

## Usage

```
  _____  ___   __ __  ____      __    ___  ____   __ __
 / ___/ /   \ |  T  T|    \    /  ]  /  _]|    \ |  T  T
(   \_ Y     Y|  |  ||  D  )  /  /  /  [_ |  D  )|  |  |
 \__  T|  O  ||  |  ||    /  /  /  Y    _]|    / |  ~  |
 /  \ ||     ||  :  ||    \ /   \_ |   [_ |    \ l___, |
 \    |l     !l     ||  .  Y\     ||     T|  .  Y|     !
  \___j \___/  \__,_jl__j\_j \____jl_____jl__j\_jl____/


Usage: sourcery [options]

Options:
  -V, --version                      output the version number
  -d, --domains <list>               comma-separated list of root domains; sourcery looks for results under these domains
  -e, --extensions <list>            comma-separated list of extensions; sourcery parses results from files with these extensions
  -f, --file <file>                  file containing URLs to visit (overrides -u)
  -o, --output <dir>                 path to output directory (default: "$PWD")
  -p, --pause                        pause on last page
  -u, --url <url>                    single URL to visit (implies -p)
  -x, --proxy <[proto://]host:port>  use a proxy (e.g. Burp) for Chromium
  -h, --help                         display help for command
```

`sourcery` expects a single `--url` or `--file` of URLs and visits them in serial. You can instruct `sourcery` to pause on the last webpage with the `-p` option, in case you want to manually navigate/test functionality. `sourcery` will continue to find endpoints, subdomains, and URLs that fall under the specified `--domains`.
