#!/usr/bin/env node

'use strict'

const { once } = require('events')
const fs = require('fs')
const commander = require('commander')
const path = require('path')
const puppeteer = require('puppeteer')

const EXTENSIONS = [
  'asp', 'aspx', 'css',
  'htm', 'html', 'js',
  'json', 'php', 'txt',
  'xml'
]

const banner = fs.readFileSync(path.join(__dirname, 'banner'), 'utf8')
const error = msg => console.error('\x1b[31m%s\x1b[0m', msg)
const warn = msg => console.warn('\x1b[33m%s\x1b[0m', msg)

const program = new commander.Command()

const matchAll = (regex, string, cb) => {
  let match

  while ((match = regex.exec(string))) {
    cb(match)
  }
}

const sortFile = async filename => {
  const data = await fs.promises.readFile(filename, 'utf8')
  const lines = data.split('\n').filter(Boolean)
  const sorted = [...new Set(lines)].sort().join('\n')
  await fs.promises.writeFile(filename, sorted, 'utf8')
}

const regex = {
  path: /("|')(\/[\w\d?&=#.!:_-][\w\d?/&=#.!:_-]*?)\1/g,
  url:  /https?:\/\/[^\s,'"|()<>[\]]+/g
}

program
  .version('0.0.0')
  .arguments('<url>')
  .option('-d, --domains <list>', 'comma-separated list of domains; sourcery looks for results under these domains')
  .option('-e, --extensions <list>', 'comma-separated list of extensions; sourcery parses results from files with these extensions')
  .option('-o, --output <dir>', 'path to output directory', '.')
  .option('-s, --sort-every <int>', 'sort output files every x seconds, removing duplicate values', 60)
  .option('-x, --proxy <[proto://]host:port>', 'use a proxy (e.g. Burp) for Chromium')
  .action(async (url, opts) => {
    try {
      const stat = await fs.promises.lstat(opts.output)

      if (!stat.isDirectory()) {
        throw Error
      }
    } catch {
      error('[!] Not a directory: ' + opts.output)
      process.exit(1)
    }

    let domains = (opts.domains || '')
      .split(',')
      .filter(Boolean)

    domains = [...new Set(domains)]

    if (!domains.length) {
      error('[!] No domains specified')
      process.exit(1)
    }

    const sortEvery = +opts.sortEvery * 1e3

    let extensions = (opts.extensions || EXTENSIONS)
      .split(',')
      .filter(Boolean)
      .map(ext => ext.trim().toLowerCase())

    extensions = [...new Set(extensions)]
    const args = []

    opts.proxy && args.push('--proxy-server=' + opts.proxy)

    error(banner)

    let exts = extensions.slice(0, 3).join(', ')

    if (exts.length > 3) {
      exts += ', etc.'
    }

    warn('[-] Opening browser window')
    warn('[-] Root domains: ' + domains.join(', '))
    warn('[-] Parsing endpoints from files with extensions: ' + exts)

    extensions = extensions.map(ext => '.' + ext)

    const browser = await puppeteer.launch({
      args,
      defaultViewport: null,
      headless: false
    })

    const page = await browser.newPage()
    const uniqueDomains = new Set()

    const domainsFile = path.resolve(opts.output, 'domains.txt')
    const pathsFile = path.resolve(opts.output, 'paths.txt')
    const urlsFile = path.resolve(opts.output, 'urls.txt')

    const streams = {
      domains: fs.createWriteStream(domainsFile, { flags: 'a' }),
      paths: fs.createWriteStream(pathsFile, { flags: 'a' }),
      urls: fs.createWriteStream(urlsFile, { flags: 'a' })
    }

    const pathCb = ([,, path]) => streams.paths.write(path + '\n')

    const urlCb = ([url]) => {
      try {
        url = new URL(url)
      } catch {
        return
      }

      const inScope = !url.hostname.startsWith('*.') && domains.some(domain => {
        return url.hostname === domain || url.hostname.endsWith('.' + domain)
      })

      if (inScope) {
        if (!uniqueDomains.has(url.hostname)) {
          uniqueDomains.add(url.hostname)
          streams.domains.write(url.hostname + '\n')
        }

        streams.urls.write(url.href + '\n')
      }
    }

    page.on('response', async resp => {
      let url

      try {
        url = new URL(resp.url())
      } catch {
        return
      }

      const headers = JSON.stringify(resp.headers())

      matchAll(regex.url, headers, urlCb)

      const { ext } = path.parse(url.pathname)

      if (ext && !extensions.includes(ext)) return

      let text

      try {
        text = await resp.text()
      } catch {
        return
      }

      matchAll(regex.url, text, urlCb)
      matchAll(regex.path, text, pathCb)
    })

    let done

    if (sortEvery) {
      (async () => {
        while (!done) {
          await Promise.all([
            sortFile(domainsFile),
            sortFile(pathsFile),
            sortFile(urlsFile)
          ])

          await new Promise(resolve => setTimeout(resolve, sortEvery))
        }
      })().catch(err => {
        error(err)
        process.exit(1)
      })
    }

    await page.goto(url)
    await once(page, 'close')

    done = true

    await Promise.all([
      sortFile(domainsFile),
      sortFile(pathsFile),
      sortFile(urlsFile)
    ])

    warn('[-] Page closed')
    warn('[-] Exiting')

    await browser.close()
  })
  .parseAsync(process.argv)
  .catch(err => error(err) || 1)
  .then(process.exit)
