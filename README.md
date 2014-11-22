#Deluge Client

A simple promise based JavaScript library that will let you use Deluge API
It uses the same API as the Deluge web client. It works as a thin
layer that will take care of authentication and error handling.

### Basic usage

```javascript
var options = {
    apiUrl: 'http://localhost:8112/json',
    password: 'deluge'
};
var client = new DelugeClient(options);
client.call('web.update_ui')
    .then(function (uiState) {
        // ...do something
    })
    .catch(console.log)
```

Some base methods are already predefined (check the code more info).

```javascript
client.updateUi().then(function (uiState) { });
```

### Supported API

As this library is only a layer, any API method is supported through the
`call` function. List of Deluge API methods can be found
[here](http://deluge-torrent.org/docs/master/modules/ui/web/json_api.html).

I also recommend installing [Deluge WebAPI plugin](https://github.com/idlesign/deluge-webapi)
that extends the API and provides several [additional methods](http://deluge-webapi.readthedocs.org/en/latest/quickstart.html#api-methods)
(functions `client.addTorrent()` and `client.getTorrents()` require this
plugin to work).

Another way to discover particular API methods is to monitor the requests
made by the web client in the browser.

Licence [MIT](LICENCE)