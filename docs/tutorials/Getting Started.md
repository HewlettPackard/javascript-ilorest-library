Yo man whatsup, you will never know how lucky you are to read this best tutorial in the world. Let's get it started.

## Installation
```
$ npm install --save nodejs-proliant-sdk
```

## Use SDK in your Node.js project

>First we need to initiate a client instance. Every request we make will be sent by this instance
```
var rest = require('nodejs-proliant-sdk');
var client = rest.restClient('https://15.119.209.XXX');
```
- - - -
>Now we have a client instance, let's login to it
```
client.login("admin", "password123").then(function (res) {
    console.log(res);
}).catch(function (err) {
    console.log(err);
});
```
- - - -
>Awesome! Isn't it?
>Now is time to take a look at the root object of the API
```
client.getRootObject().then(function (res) {
    console.log(res);
});
```
>Beautiful! Right?
>
