# Licences of vendored libraries

The files in this folder are third-party code, copied in unchanged. Their licence notices are kept here, as the licences require. Do not edit the vendored files.

| Folder | Library | Version | Licence |
|---|---|---|---|
| `leaflet/` | Leaflet | 1.9.4 | BSD 2-Clause |
| `shp/shp.min.js` | shpjs, with the libraries bundled inside it | 4.0.4 | MIT, plus the licences listed below |

## Leaflet 1.9.4

https://leafletjs.com. The images in `leaflet/images/` ship with Leaflet under the same licence.

```
BSD 2-Clause License

Copyright (c) 2010-2023, Volodymyr Agafonkin
Copyright (c) 2010-2011, CloudMade
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

## shpjs 4.0.4

https://github.com/calvinmetcalf/shapefile-js. Reads zipped shapefiles in the browser. The file `shp/shp.min.js` is the ready-made browser bundle, so it contains shpjs and the libraries it depends on. The shpjs package declares the MIT licence and names Calvin Metcalf as author, but ships no separate licence file. The copyright holders of everything inside the bundle are listed in the next section.

## Libraries bundled inside shp.min.js

These are the dependencies of shpjs that end up in the bundle. Copyright lines are taken from each project's own licence file.

MIT licence, one text for all of the following:

| Library | Copyright |
|---|---|
| shpjs | Calvin Metcalf |
| JSZip (used under its MIT option, it is dual licensed MIT or GPLv3) | 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, Antonio Afonso |
| proj4 | 2014 Mike Adair, Richard Greenwood, Didier Richard, Stephen Irons, Olivier Terral and Calvin Metcalf |
| mgrs | 2012 Mike Adair, Richard Greenwood, Didier Richard, Stephen Irons, Olivier Terral, Calvin Metcalf |
| pako | 2014-2017 Vitaly Puzrin and Andrei Tuputcyn |
| parsedbf | 2013 Calvin Metcalf |
| lie | 2014-2018 Calvin Metcalf, Jordan Harband |
| immediate and setimmediate | 2012 Barnesandnoble.com, llc, Donavon West, Domenic Denicola (and Brian Cavalier for immediate) |
| readable-stream, string_decoder, core-util-is | Node.js contributors, and Joyent, Inc. and other Node contributors |
| process-nextick-args | 2015 Calvin Metcalf |
| safe-buffer | Feross Aboukhadijeh |
| util-deprecate | 2014 Nathan Rajlich |

```
The MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

ISC licence, for lru-cache (Isaac Z. Schlueter and contributors) and inherits (Isaac Z. Schlueter):

```
The ISC License

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Loaded from the internet, not stored here

These are not part of the repository, so they carry no notice here. They are named for credit.

- Google Earth Engine JavaScript client, from jsDelivr. Apache 2.0.
- Map tiles from OpenStreetMap, shown with the credit "OpenStreetMap contributors" (ODbL).
- Source Sans 3 and Source Serif 4, from Google Fonts. SIL Open Font Licence.