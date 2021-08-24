---
title: "How to learn programming"
excerpt: "Few skills that you pick up in life will change you as much as learning how to program. So you should start right now. This is the guide you have been waiting for. I will teach you how to do it."
coverImage: "/assets/blog/how-to-learn-programming/header.jpg"
date: "2021-02-16T05:35:07.322Z"
author:
  name: Rico Trebeljahr
  picture: "/assets/blog/how-to-learn-programming/header.jpg"
ogImage:
  url: "/assets/blog/how-to-learn-programming/header.jpg"
---

Few skills that you pick up in life will change you as much as learning how to program. So you should start right now. This is the guide you have been waiting for. This will teach you how to do it.

The language: JavaScript. Why? It is the language of the web. And there is a huge ecosystem around it, so that many problems that you will encounter have already been solved by other people. And you can use it these days to create almost everything, from servers, to desktop applications, to mobile apps and of course websites.

So let's start, shall we. Let's open the console of your browser. How to do this you ask? It depends a little bit on 2 things, browser and operating system.

First which browser are you on?

#### Chrome:

- Press Ctrl+Shift+J (Windows / Linux) or Cmd+Opt+J (Mac)

#### FireFox:

- Press Ctrl+Shift+K (Windows / Linux) or Command+Option+K (Mac)

#### Safari:

- Safari is a bit more complicated... You need to enable the **"Developer Menu"** first. Go into preferences (**Safari Menu > Preferences**) and select the **Advanced Tab**. Within that you can find the Option: **Show Develop menu in menu bar**. Enable it.

- When you did so, Press Option + ⌘ + C.

Good, you have the console open? On chrome it should look something like this.

<img src="./assets/blog/how-to-learn-programming/open-console.png">

## JS-101

Now with the console open, click into it (next to the little >), and type the following into the console window... Then. Hit Enter.

```javascript
console.log("Hello World");
```

So... what just happened?

The console is the thing you just opened and you logged "something" into it. The "something" in this case being a string - namely "Hello world". There is also an `undefined` being put out, why that is the case we will cover later. You can try other somethings, a few interesting ones to try out:

```javascript
console.log(7);
console.log(NaN);
console.log(1, 2, 3);
console.log(null);
console.log([1, 2, 3]);
console.log({ a: "Hello", b: "There" });
```

Why are those interesting? Glad you asked. As you can see - they are highlighted somewhat differently from the "Hello World". This is because they are of different types.

But what is a type? In programming you have different things. Just like you have different tools in the real world with different properties and use cases, hammers, nails, duct tape, saws, screwdrivers, knives etc. you have different tools at your disposal when working with code. Those different tools have different groups they belong to. And that's what types are.

There are very simple ones such as numbers, or single characters. But they can be more complex, like collections of characters - which are called strings. Or they can be other sorts of things like Arrays, Objects, Sets or Maps... the list goes on. But don't worry, we will cover each of them in detail, throughout this long article.

But first let's introduce another concept: variables. This is what they look like in JavaScript.

```javascript
const variable = "Hello world";
let variable2 = "Hello there";
var theyDontHaveToBeNamedVariableButCanBeNamedWhateverYouWant =
  "yeah really! ^^";
```

As you can see from the highlighting there are 4 different parts that go into making a variable.

The keyword: One of the following:

```javascript
const let var
```

The name which can be whatever you like as long as it is not a JavaScript keyword or reserved punctuation.

```javascript
const thisCanBeAlmostWhateverYouLike
```

The "assignment operator":

```javascript
=
```

And the value:

```javascript
"Hello world";
```

put together they form a variable declaration:

```javascript
const thisCanBeAlmostWhateverYouLike = "Hello world";
```

if you write this into your console and hit Enter you get back an `undefined` ... Why is that? When you type something into the console the statement you typed is "evaluated". That means that whatever you typed is run by the console as JavaScript code. Different code produces different outputs. When you typed

```javascript
console.log("Hello World");
```

it did not only produce `"Hello World"` either, but it added the `undefined` as a second line. `undefined` is JavaScript's way of saying - there is nothing here. In other words both statements, the console.log and the variable declaration don't produce anything as output. They are kinda "silent" when you poke them. And silence/nothingness is resembled by this keyword: undefined.

```javascript
const a = "Hello world";
a;
```

Now if you run these two lines in sequence you will get some output. Namely the value of the variable a. It makes sense to ponder a bit why that is the case.

First we define a variable to be the value "Hello world". Then we simply write the letter a. The thing is: if JavaScript code is evaluated variables will be replaced with their assigned values. So the output of this program is the value of a! And that is what we see, the console answers: `"Hello World"`

Now let's look at a different piece of code. Before you paste it into the console... think a bit about what it actually means and try to guess what it is going to do. Is it going to work? What value will it produce? Or might JavaScript be confused by this?

```javascript
const a = "b";
b;
```

The answer is that this will throw an error.

<img src="./assets/blog/how-to-learn-programming/variable-reference-error.png" />

Why? The error is pretty much self explanatory. b is not defined. The code running in the console doesn't yet know what b is. Now let's do something interesting.

```javascript
const b = "Something";
```

Hit enter. You can then use the up/down arrows, to go over the history of the things you have typed in the console. Type this:

```javascript
const a = "b";
b;
```

again. And notice. This time it logs `Something`... the value of b. Once again let's think about what just happened. The console code is not just aware of what you type into it at that moment but also aware of what has been typed before. It remembers variable declarations so to speak so that they can be re-used later on. The concept behind that is "environment" or "scope". Code is always executed within an environment, where certain variables are defined and have values, while others are still free to be defined for our own use cases. In the browser console there are quite a few variables already defined that we could use, that relate to properties of the browser itself. The environment is not quite empty so to speak, but comes pre-filled with lots and lots of good stuff. Enough talking though, let's actually see some of this environment in action.

```javascript
window;
```

A lot of things are defined on this.

```javascript
const time = new Date();
time;
```
