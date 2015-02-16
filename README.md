Simple Service Worker Push Demo
=======

The goal of this repo is to demonstrate how to implement push
notifications into your web app.

## Requirements

- You need to be using Chrome version 42 ([See "Current Release Information" here](http://www.chromium.org/developers/calendar))
- Have "Experimental Web Platform" features enabled (Will hopefully go away as a requirement very soon)

## Using the Demo

To try out the demo locally, clone the repo and run the following:

1. Install the required NPM modules for building the project

        npm install

1. Install gulp globally

        npm install gulp -g

1. Run the gulp server

        gulp serve

This will open up your browser on the relevant page, now if you open http://localhost:3000 in Chrome canary you should be able to enable push notifications.

[Imgur](http://i.imgur.com/Y2yafBv.png)

The two methods you can send a push message to your device after enabling it are:

1. Send a push to GCM via XHR
    - This button sends a request to an [App Engine app](https://github.com/gauntface/simple-push-demo-backend) which then sends a request to GCM (Google Cloud Messaging), emulating what would happen when a server wants to send a push message to a user.

1. Send a push to GCM using CURL
    - This option is nice and easy, copy and paste the CURL command into a terminal and it will make a request to GCM (Google Cloud Messaging) which will then send the push message. Useful to see what a request to GCM consists of.

