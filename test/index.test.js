var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var assert = require('assert');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var DelugeClient = require('../index');

var PORT = process.env.PORT || 3010;
var PASSWORD = 'password';
var SESSION_ID = '9f981b27fcc2bba921ae2112eeb53cae2420';

function makeResponse(id, result, error, code) {
    var errorObj;
    if (error) {
        errorObj = {
            message: error,
            code: code || 0
        }
    }
    return JSON.stringify({
        id: id,
        result: result,
        error: errorObj
    })
}

var app = express();
app.use(bodyParser.json());
app.use(cookieParser());

app.post('/not-json', function (req, res) {
    res.send('<html></html>');
});

app.post('/failed', function (req, res) {
    res.send(makeResponse(0, null, 'This call failed for some reason'));
});

app.post('/json', function (req, res) {
    var body = req.body;

    // Authenticate
    if (body.method == 'auth.login') {
        var password = body.params[0];
        if (password !== PASSWORD) {
            return res.send(makeResponse(body.id, false));
        }
        res.cookie('_session_id', SESSION_ID);
        return res.send(makeResponse(body.id, true))
    }

    // Verify cookies
    if (!req.cookies._session_id || req.cookies._session_id != SESSION_ID) {
        return res.send(makeResponse(body.id, null, 'Not authenticated', 1));
    }

    // Sample method that returns given params
    if (body.method == 'web.return_params') {
        return res.send(makeResponse(body.id, body.params))
    }

    // Another sample method
    if (body.method == 'web.update_ui') {
        return res.send(makeResponse(body.id, 'status'));
    }

    res.send(makeResponse(0, null, 'API call failed: Unknown method'));
});

app.listen(PORT);

chai.use(chaiAsPromised);
chai.should();

describe('DelugeClient', function () {

    describe('when server does not exist', function () {
       it('should throw "HTTP request failed exception" exception', function () {
           var client = new DelugeClient({
               apiUrl: 'http://localhost:0'
           });
           return client.updateUi().should.eventually.be.rejectedWith(Error, /^HTTP request failed/);
       });
    });

    describe('when server does not respond with JSON', function () {
        it('should throw "Not a valid JSON response" exception', function () {
            var client = new DelugeClient({
                apiUrl: 'http://localhost:' + PORT + '/not-json'
            });
            return client.updateUi().should.eventually.be.rejectedWith(Error, /^Not a valid JSON response./);
        });
    });

    describe('when API call fails', function () {
        it('should throw "API call failed" exception', function () {
            var client = new DelugeClient({
                apiUrl: 'http://localhost:' + PORT + '/failed'
            });
            return client.updateUi().should.eventually.be.rejectedWith(Error, /^API call failed./);
        })
    });

    describe('when the password is wrong', function () {
        it('should throw "Authentication failed" exception', function () {
            var client = new DelugeClient({
                apiUrl: 'http://localhost:' + PORT + '/json',
                password: 'blah blah'
            });
            return client.updateUi().should.eventually.be.rejectedWith(Error, /Authentication failed/);
        });
    });

    describe('when the password is correct', function () {
        var client = new DelugeClient({
            apiUrl: 'http://localhost:' + PORT + '/json',
            password: PASSWORD
        });

        it('should run auth request and remember the session id', function () {
           return client.updateUi().should.eventually.be.fulfilled;
        });

        describe('when a method is called', function () {
            it('should return its result', function () {
                var params = [ 'first', 'second' ];
                return client.call('web.return_params', params).should.become(params);
            });
        });

        describe('when an unknown method is called', function () {
           it('should throw "API call failed" exception', function () {
               return client.call('web.unknown method', []).should.eventually.be.rejectedWith(Error, 'API call failed: Unknown method');
           })
        });
    });

    describe('when session id expires', function () {
       it('should rerun the auth request and get new session id', function () {
           var client = new DelugeClient({
               apiUrl: 'http://localhost:' + PORT + '/json',
               password: PASSWORD
           });
           return client.updateUi()
               .then(function () {
                   // Simulate cookie expiration by changing SESSION ID
                   SESSION_ID = SESSION_ID + 'abcde';
                   return client.updateUi()
               }).should.eventually.be.fulfilled;
       });
    });
});