# Screenshot tool

Built to automate the cryptoslam reporting. This tool generates a screenshot of the table, and scrapes the relevant fields from Cryptoslam & Immutascan. It's sketchy but it works.

## Prerequisites

Use node v16+, and install dependancies with `npm i `

## Run

`npx ts-node ./src/screenshot.ts` to execute the app.

## Docker Build
`docker build --platform linux/amd64 -t crypto-tracker .` to build image