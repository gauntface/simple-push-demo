![Simple Push Demo title card with a paper airplane](./default-social.png)

# Simple Push Demo

The goal of this repo is to demonstrate how to implement push
notifications into your web app.

## Relevant Docs Information

- [Server Side Libraries to Help Send Push Messages ](https://github.com/web-push-libs/)
- [Blog Post on Encrypting Payload Data](https://developers.google.com/web/updates/2016/03/web-push-encryption)
- [Blog Post on VAPID](https://developers.google.com/web/updates/2016/07/web-push-interop-wins)
- [Web Push Book](https://web-push-book.gauntface.com)

## Demo

Visit [the demo here](https://simple-push-demo.vercel.app/).

## Development

You can develop this project locally by running the following:

```shell
npm run install
npm run dev
```

## Testing

Tests can be run with `npm run test` which will run tests using puppeteer.

If you want to view and run the browser tests in your own browser, which
is useful for debugging, start a server in the root of this project and
navigate to the `/test/browser-tests/index.html` page.

## Hosting

This project is hosted on vercel and can be tested locally using the vercel
CLI by running:

```shell
npm run vercel
```
