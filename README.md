# Mongo Playground

[![npm version](https://badge.fury.io/js/mongo-playground.svg)](https://badge.fury.io/js/mongo-playground)

I haven't liked any of the Mongo tools out there and using mongo from the CLI
is unwieldy, especially for complicated aggregations.  Mongo Playground is
themed from the GraphQL Playground, which was based upon GraphiQL.

![Screenshot](https://discourse-cdn-sjc1.com/meteor/uploads/default/optimized/2X/7/73f92acf311fa44666a1c22ac97fa85557746552_2_1380x808.png)

## Features

* Supports queries using latest MongoDB Driver 3.1
* Connects to any MongoDB server using `mongodb` or `mongodb+srv` URLs
* Drop down lists all available methods
* Auto-populates list of collections to query
* Syntax highlighting and pretty printing of response data, including errors
* Helpful auto-formatting in textarea
* Nice interface 👍

## Using

```Shell
git clone https://github.com/Perceptive/mongo-playground.git
npm install
npm start
```

Then navigate to `http://localhost:4000`.

## WARNING

This product is not safe to use in any production capacity.  There is no input
validation or sanitation whatsoever, nor are there any CORS or other security
checks performed.  Do not integrate this into your product.  This is strictly
to aid in development.
