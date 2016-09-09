# QnA Maker - Minimal Bot example

Minimalist demonstration of integrating the [QnA Maker](http://qnamaker.botframework.com).

The QnA Maker is a great service currently under active development at Microsoft that automates the 
publishing of FAQ-style content in a manner that makes it easy to consume from a Bot or 
conversational type interface.

You just feed it a simple structured document containing question and answers pairs or even just 
point to a URL that hosts your existing FAQ content and out pops a URL endpoint that you can pass 
natural language queries to. Like this:

  http://qnaservice.cloudapp.net/KBService.svc/GetAnswer?kbId=a3dae93561d24529b11a4c0eb8acd444&question=What%20is%20cortana

It also exposes the ability to tweak the model by training. If you ask a question and get an 
unexpected answer you can head back into the admin pages to edit the model, show it which answer 
you wanted it to return for any particular question and then retrain and republish the udpated 
model. It's easy to imagine (but not demonstrated here) a scheme where questions people are 
not getting answers to are flagged in the logs and periodically used to retrain better and better 
models.

It's a pretty powerful service, I think, and addresses one of the most common use cases for Bot 
interfaces which is the automated servicing of the most commonly asked questions to customer 
helpdesks.

#### Calling from a Bot interface

Couldn't be easier really, just pass any message we think is a question straight to our QnA endpoint and show the user what comes back. Of course we can get as complex as we like here, adding metadata to the answer for instance to influence whether we show [Cards](https://docs.botframework.com/en-us/node/builder/chat-reference/classes/_botbuilder_d_.herocard.html) or other fancy stuff but the 
simplest implementation is just to make the request and display the response.

For the purposes of this demo we've pre-trained a QnA Maker service on the existing 
[Bot Framework FAQ](https://docs.botframework.com/en-us/faq/) but of course you can use any
FAQ-style content you want. Just rememember the change the qnaUri setting in localConfig.json 
to point your own endpoint.

##### Setting up your new Bot

 - Clone this repo, natch!!
 - Create a [new bot](https://dev.botframework.com/bots/new). Make sure you copy the app password as this is the /only/ time you'll get to see it.
 - Copy and paste the App Password and Microsoft App Id into ./localConfig.json at the appropriate places
 - Deploy your bot to a publicly accesible URI (or use a tool like [ngrok](https://ngrok.com/) to
make your dev machine publicly available) and configure the bot's Messaging Endpoint with that URI. Use the 'Test' button on the bot config page to check this is all working. If you see 'Accepted' come back as the response then all is working.
 - Add your bot to Skype using the button available in the Channels section of the bot's config page
 - Start the bot: node app.js

And that's it.. you should now be able to ask the Bot in your Skype chat anything you like about the Microsoft Bot Framework.

###### Channel Transfer ??

Out of the box you get 2 channels set up without any messing around every time you set up a new bot. Skype and the WebChat. With a little more messing around you can get a whole bunch more. What you'll soon start to figure out though is that none of your identities in these channels are linked in any way. That's not a fault of the Bot Framework, it's just that we can't magically know that the username you use for Slack, say, and your name on Skype are in any way related. 

If this is a problem for your intended application you'll have to persuade the user to help you link those two ids together, possibly adding a mapping to your own app's concept of user id along the way. A simple way of doing this is just to generate some unique token identifier which you record against one channel's user id (I wouldn't recommend using a user id directly as that could constitute a security risk). If the user then pastes that token into some other channel then you can now link the two channel ids back to your own apps concept of user id. It's super elegant but it does work and solves the immediate problem. Perhaps we'll see solutions developed sometime soon that address this kind of issue as the bot technology increasingly enters the mainstream.
