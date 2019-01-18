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
* Helpful auto-formatting and syntax highlighting in textarea
* Tabs for running multiple simultaneous queries
* Use of local storage so you can leave, come back later, and continue where you left off
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

## Release Notes

### v1.3.0

* Added tabs for running simultaneous queries
* Fixed bug preventing object queries from properly evaluating
* Added support for regular expressions in queries

### v1.2.0

* Added basic error checking to textarea
* Added syntax highlighting to textarea
* Persistently store collection names and field values in local storage

### v1.1.0

* Fixed bug preventing copy from textarea
* Added loader icon
* Collections field now auto populates with alphabetized list of all collections in database
* Fixed JSON encoding issues server-side
* Methods list now contains proper, non-deprecated methods

### v1.0.0

* Initial Release
