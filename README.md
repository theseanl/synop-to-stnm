# SYNOP To Station Model

An web app for crawling SYNOP reports, and drawing station model from it.
This mostly follow conventions from ROK Air Force. However, this software is not relevant in any way to the actual operation; this is solely for general educational purpose.

## Installation

```
yarn install
```

## Developement

Create a local server that watches sources and automatically rebuilds and reloads the website by executing:
```
make deploy
```
Create a local server with production resources built with [tscc](https://github.com/theseanl/tscc) by executing:
```
make deploy PROD=true
```

## License
MIT

