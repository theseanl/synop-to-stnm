# SYNOP To Station Model

An web app for crawling SYNOP reports, and drawing station model from it.
This mostly follow conventions from ROK Air Force. However, this software is not relevant in any way to the actual operation; this is solely for general educational purpose.

## Installation

```
yarn install
```

## Developement

You need `inotifywait` which can be installed by `sudo apt-get install inotify-tools`.

Create a local server that watches sources and automatically rebuilds and reloads the website by executing:
```
make deploy
```
Create a local server with production resources built with [tscc](https://github.com/theseanl/tscc) by executing:
```
make deploy PROD=true
```

## Backgrounds

This web app was developed while I was surving my mandatory military service in ROK. Due to severe restrictions in ROK military, I was not allowed to have a personal computer and all I could get was an iPad.

It has served 3 purposes for me:
 1. Exercising MVC pattern, using ES2017 async-await.
 2. Getting some experience with progressive web apps and service worker API.
 3. Dogfooding for my another project [TSCC](https://github.com/theseanl/tscc)
 4. Getting used to make, and implementing common webpack plugin functionality in make.
 5. Getting comfortable with Linux.

This was developed with the help of AWS, [Blink shell](https://blink.sh/), [coc-tsserver](https://github.com/neoclide/coc-tsserver).

## License
MIT

