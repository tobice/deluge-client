require('superagent-bluebird-promise');
var request = require('superagent');
var _ = require('lodash');

function DelugeClient (options) {
    this.options = _.merge({
        id: Math.floor((Math.random() * 1000) + 1), // id for identifying messages
        apiUrl: 'http://localhost:8112/json',
        password: 'deluge'
    }, options || {});

    // Use agent() to remember cookies
    this.agent = request.agent();
}

DelugeClient.get = function (options) {
    var client = new DelugeClient(options);
    return client.auth();
};

DelugeClient.prototype.request = function (method, params) {
    return this.agent
        .post(this.options.apiUrl)
        .buffer(true)
        .set('Accept-Encoding', 'gzip, deflate')
        .set('Accept', 'application/json')
        .set('Content-Type', 'application/json')
        .send({
            id: this.options.id,
            method: method,
            params: params
        })
        .promise()
        .catch(function (err) {
            throw new Error('HTTP request failed: ' + err.message + '. ' +
            'Are you sure that correct apiUrl is used and that deluge-web is' +
            ' running?');
        })
        .then(function (res) {
            if (res.ok) return res;
            throw new Error('HTTP request failed: ' + res.error.message);
        })
        .then(function (res) {
            // API is probably not sending proper headers, so we have to parse
            // the response manually. Calling .buffer(true) is essential to
            // get this working.
            var json = JSON.parse(res.text);

            if (json.error) {
                throw new Error('API call failed:' + json.error.message);
            }
            return json.result;
        });
};

DelugeClient.prototype.auth = function () {
    var client = this;
    return this.request('auth.login', [this.options.password])
        .then(function () {
            return client;
        });
};

DelugeClient.prototype.addTorrent = function (metainfo, options) {
    return this.request('webapi.add_torrent', [metainfo, options]);
};

DelugeClient.prototype.getTorrents = function (torrents, data) {
    return this.request('webapi.get_torrents', [
        torrents || null,
        data || null
    ]);
};

DelugeClient.prototype.getTorrentFiles = function (torrentId) {
    return this.request('web.get_torrent_files', [torrentId]);
};

DelugeClient.prototype.updateUi = function (data) {
    return this.request('web.update_ui', [
        data || ["name", "hash", "download_payload_rate", "upload_payload_rate", "eta", "progress"],
        [] // filtering by torrents currently doesn't work
    ]);
};


module.exports = DelugeClient;