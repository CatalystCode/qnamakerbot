# QnA Maker - Minimal Bot example

Minimalist demonstration of integrating the [QnA Maker](http://qnamaker.botframework.com).

The app default to a CLI. If you wish to integrate this into a supported channel you'll need to:

 - Create a [new bot](https://dev.botframework.com/bots/new)
 - Change app.js to create a ChatConnector instead of a ConsoleConnector
 - Deploy your bot to a publicly accesible URI (or use a tool like [ngrok](https://ngrok.com/) to
make your dev machine publicly available)
 - Create localConfig.json in the root directory of this app containing the following:
```
  {
    "MICROSOFT_APP_ID" : "--INSERT-YOUR-APP-ID-HERE--",
    "MICROSOFT_APP_PASSWORD" : "--INSERT-YOUR-APP-PASSWORD-HERE--"
  }

```
(these values are generated as part of the bot creation process)
 - Configure at least one channel to be able to access your bot.

