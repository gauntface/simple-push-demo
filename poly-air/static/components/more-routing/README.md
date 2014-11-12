Routing
=======

A composable suite of objects and elements to make routing with web components 
a breeze.

* [Hash-](#MoreRouting.HashDriver) and [path-](#MoreRouting.PathDriver)based 
  routing.
* [Named routes](#more-routing).
* [Nested (mounted) routes](#more-route--nesting).
* [Declarative route switching](#more-route-switch).
* [Polymer helpers](#polymer-helpers--filters) for easy integration into existing elements.

TL;DR via [`more-route-selector`](#more-route-selector):

```html
<more-routing driver="path"></more-routing>
<more-route name="user" path="/users/:userId">
  <more-route name="user-bio" path="/bio"></more-route>
</more-route>

<more-route-selector routes="['user', '/about', '/']" selectedIndex="{{pageIndex}}" selectedParams="{{params}}"></more-route-selector>
<core-pages selected="{{pageIndex}}">

  <div>
    <header>User {{params.userId}}</header>
    <template if="{{ route('user-bio').active }}">
      All the details about {{params.userId}} that you didn't want to know...
    </template>
  </div>

  <div>
    It's a routing demo!
    <a href="{{ urlFor('user-bio', {userId: 1}) }}">Read about user 1</a>.
  </div>

  <div>
    The index.
  </div>

</core-pages>
```

TL;DR via [`more-route-switch`](#more-route-switch):

```html
<more-routing driver="path"></more-routing>
<more-route name="user" path="/users/:userId">
  <more-route name="user-bio" path="/bio"></more-route>
</more-route>

<more-route-switch>

  <template when-route="user">
    <header>User {{params.userId}}</header>
    <template if="{{ route('user-bio').active }}">
      All the details about {{params.userId}} that you didn't want to know...
    </template>
  </template>

  <template when-route="/about">
    It's a routing demo!
    <a href="{{ urlFor('user-bio', {userId: 1}) }}">Read about user 1</a>.
  </template>

  <template else>
    The index.
  </template>

</more-route-switch>
```


Element API
===========

<a name="more-routing"></a>
`<more-routing>`
----------------

_Defined in [`more-routing.html`](more-routing.html)._

The declarative interface for configuring [`MoreRouting`](#MoreRouting).
Currently, this lets you declare which [driver](#MoreRouting.Driver) you wish 
to use (`hash` or `path`):

```html
<more-routing driver="hash"></more-routing>
```

You should place this as early in the load process for your app as you can. Any
routes defined prior to the driver being set will trigger an error.


<a name="more-route"></a>
`<more-route>`
--------------

_Defined in [`more-route.html`](more-route.html)._

Reference routes by path, and extract their params:

```html
<more-route path="/users/:userId" params="{{user}}"></more-route>
```

Declare a named route:

```html
<more-route path="/users/:userId" name="user"></more-route>
```

Reference a named route:

```html
<more-route name="user" params="{{user}}"></more-route>
```


<a name="more-route--nesting"></a>
### Route Nesting

Routes can also be nested:

```html
<more-route path="/users/:userId" name="user">
  <more-route path="/bio" name="user-bio"></more-route>
</more-route>
```

In this example, the route named `user-bio` will match `/users/:userId/bio`.

_Nesting isn't restricted to `<more-route>` elements! See
[`<more-route-switch>`'s `routeContext` attribute](more-route-switch--nesting) 
for an example of nesting within your live DOM._


<a name="more-route-selector"></a>
`<more-route-selector>`
-----------------------

_Defined in [`more-route-selector.html`](more-route-selector.html)._

Given a list of routes to evaluate, `more-route-selector` chooses the **first**
active route from that list.

```html
<more-route-selector
  routes="['user', '/about', '/']"
  selectedIndex="{{index}}"
  selectedParams="{{params}}">
</more-route-selector>
```

It exposes information about the selected route via a few properties:

`selectedIndex`: The index of the selected route (relative to `routes`).

`selectedPath`: The path expression of the selected route.

`selectedParams`: The params of the selected route.


<a name="more-route-switch"></a>
`<more-route-switch>`
---------------------

_Defined in [`more-route-switch.html`](more-route-switch.html)._

A simple way of declaring a set of mutually exclusive routes, and the elements
that should be displayed when each is active. Built on top of
[`more-switch`](https://github.com/Polymore/more-switch).

```html
<more-route-switch>

  <template when-route="user">
    <header>User {{params.userId}}</header>
    <template if="{{ route('user-bio').active }}">
      All the details about {{params.userId}} that you didn't want to know...
    </template>
  </template>

  <template when-route="/about">
    It's a routing demo!
    <a href="{{ urlFor('user-bio', {userId: 1}) }}">Read about user 1</a>.
  </template>

  <template else>
    The index.
  </template>

</more-route-switch>
```

`when-route` attributes can either be a named route, or a path, and you may use
`else` as a fallback (it is shorthand for `when-route="/"`.

Note that the route's params are injected into a `params` value in the
template's context. You can specify the name for this via `paramsProperty` on
the `more-route-switch`.


<a name="more-route-switch--nesting"></a>
### Nesting Contexts

Similar to [`more-route`'s nesting behavior](#more-route--nesting), you can
declare a `more-route-switch` to be a nesting context for any routes defined
within its children.

```html
<more-route-switch routeContext>

  <template when-route="/users/:userId">
    <!-- The full path for this would be /users/:userId/posts. -->
    <more-route path="/posts"></more-route>

  </template>

</more-route-switch>
```

This is very handy for creating "mount points" within your elements. Also, 
note that you can use named routes to break out of a nesting context.


<a name="polymer-helpers"></a>
Polymer Helpers
---------------

<a name="polymer-helpers--filters"></a>
### Filters

_Defined in [`polymer-expressions.html`](polymer-expressions.html)._

Several filters (functions) are exposed to templates for your convenience:

#### `route`

You can fetch a `MoreRouting.Route` object via the `route` filter. Handy for
reading params, etc on the fly.

```html
<x-user model="{{ route('user').params }}"></x-user>
```

#### `urlFor`

Generates a URL for the specified route and params:

```html
<a href="{{ urlFor('user', {userId: 1}) }}">User 1</a>
```

#### `isCurrentUrl`

Determines whether a given route _and params_ match the current URL:

```html
<a href="/users/1" active?="{{ isCurrentUrl('user', {userId: 1}) }}">User 1</a>
```


JavaScript API
==============

<a name="MoreRouting"></a>
`MoreRouting`
-------------

_Defined in [`routing.html`](routing.html)._

The main entry point into `more-routing`, exposed as a global JavaScript 
namespace of `MoreRouting`. For the most part, all elements and helpers are
built on top of it.

`MoreRouting` manages the current [driver](#MoreRouting.Driver), and maintains 
an identity map of all routes.


<a name="MoreRouting.driver"></a>
### `MoreRouting.driver`

Before you can make use of navigation and URL parsing, a driver must be 
registered. Simply assign an instance of `MoreRouting.Driver` to this property.

This is exposed as a declarative element via
[`<more-routing driver="...">`](#more-routing).


<a name="MoreRouting.getRoute"></a>
### `MoreRouting.getRoute`

Returns a [`MoreRouting.Route`](#MoreRouting.Route), by path...

    MoreRouting.getRoute('/users/:userId')

...or by name:

    MoreRouting.getRoute('user')

Because routes are identity mapped, `getRoute` guarantees that it will return
the same `Route` object for the same path.


<a name="MoreRouting.Route"></a>
`MoreRouting.Route`
-------------------

_Defined in [`route.html`](route.html)._

The embodiment for an individual route. It has various handy properties.
Highlights:

``active``: Whether the route is active (the current URL matches).

``params``: A map of param keys to their values (matching the `:named` tokens)
within the path.

``path``: The path expression that this route matches.

### Paths

Path expressions begin with a `/` (to disambiguate them from route names), and
are a series of tokens separated by `/`.

Tokens can be of the form `:named`, where they named a parameter. Or they can
be regular strings, at which point they are static path parts.

Should be familiar from many other routing systems.


<a href="MoreRouting.Driver"></a>
`MoreRouting.Driver`
--------------------

_Defined in [`driver.html`](driver.html)._

Drivers manage how the URL is read, and how to navigate to URLs. There are two
built in drivers:


<a href="MoreRouting.HashDriver"></a>
### `MoreRouting.HashDriver`

_Defined in [`hash-driver.html`](hash-driver.html)._

Provides hash-based routing, generating URLs like `#!/users/1/bio`. It has a
configurable prefix (after the `#`). By default, it uses a prefix of `!/`
(to fit the [AJAX-crawling spec](https://developers.google.com/webmasters/ajax-crawling/docs/specification)).


<a href="MoreRouting.PathDriver"></a>
### `MoreRouting.PathDriver`

_Defined in [`path-driver.html`](path-driver.html)._

Provides true path-based routing (via `pushState`), generating URLs like
`/users/1/bio`. If your web app is mounted on a path other than `/`, you can
specify that mount point via the `prefix`.
