# debt-tracker

## Balance

A responsive, installable debt tracker for Flex, Lloyd’s, and Klarna. Swipe through your account cards and use the plus button to add a debt or bill with a name and remaining balance. Every account is included in the total, repayments, and borrowing. Set account balances, add borrowing, record repayments, and undo the latest update. Amounts are stored as integer pennies in GBP. No account, bank connection, or API keys are required.

## Run

Requires Python 3 (server) and Node.js 18+ (tests), with no package dependencies.

```sh
npm start
npm test
```

The development server listens on port 3000. Deploy these static files to an HTTPS host to use it on a phone. In Safari use Share → Add to Home Screen; in Chrome use Install app / Add to Home screen. The app caches its files for offline use after the first successful visit. Increment the cache version in `sw.js` when shipping changed assets.

## Your data

Balances and activity live in this browser’s local storage. They do not sync between phones, browsers, or installed apps, and clearing site data removes them. Download a backup regularly; restore it to move devices. Backups contain your balances and activity, so store them privately. This is a manual tracker: it does not make payments or retrieve bank balances. A repayment cannot exceed the current balance.

## Publish to GitHub Pages

1. Add this project to the `main` branch of `gooyerplanners/debt-tracker`, including the hidden `.github` folder and `.nojekyll` file.
2. On GitHub, open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Open **Actions → Publish Balance to GitHub Pages → Run workflow**, selecting `main`. Future pushes to `main` publish automatically, after the tests pass.
4. Wait for the deployment job to succeed. Its deployment URL is the live website. The expected URL is `https://gooyerplanners.github.io/debt-tracker/`, unless a custom domain is configured; it is not live until deployment succeeds.
5. Open the live website on your phone and use **Add to your phone**, or Safari’s Share → Add to Home Screen.

`npm run build` creates the deployable static site in `dist/`. Only application assets are published; tests, repository metadata, and development scripts are excluded. All application paths are relative, including the manifest and service worker, to support GitHub Pages’ `/debt-tracker/` path. You can also upload `dist/` to another static HTTPS host. Publishing the cloud development environment is separate from deploying this website.
