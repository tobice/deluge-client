require('superagent-bluebird-promise');
var request = require('superagent');
var _ = require('lodash');

/**
 * @param {Object=} options - Hash specifying id, apiUrl and password for connecting.
 * @constructor
 */
function DelugeClient (options) {
    this.options = _.merge({
        id: Math.floor((Math.random() * 1000) + 1), // id for identifying messages
        apiUrl: 'http://localhost:8112/json',
        password: 'deluge'
    }, options || {});

    // Use agent() to remember cookies
    this.agent = request.agent();
}

/**
 * Factory method returning initialized and authenticated instance of Deluge
 * client. If authentication fails (or something else), an error is thrown that
 * can be caught via .catch().
 *
 * @param {Object=} options - Hash specifying id, apiUrl and password for connecting.
 * @returns {Promise.<DelugeClient>} - Promise for client instance.
 */
DelugeClient.get = function (options) {
    var client = new DelugeClient(options);
    return client.auth();
};

/**
 * Perform API request.
 *
 * For complete list of supported methods see:
 * http://deluge-torrent.org/docs/master/modules/ui/web/json_api.html
 * http://deluge-webapi.readthedocs.org/en/latest/quickstart.html#api-methods
 *
 * Function automatically checks for errors and if request for some reason fails,
 * an Error is thrown. Promise doesn't return whole response body, only relevant
 * result (which is usually parsed JSON object, but it can also be a simple
 * string like 'true' for example).
 *
 * @param {string} method - Method name, i. e. 'auth.login'
 * @param {Array} params - List of params
 * @returns {Promise.<*>} - Request result.
 */
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

/**
 * Performs authentication request using password provided in the options. If
 * the authentication is successful, received COOKIE is remembered and used in
 * every request in the future. If the authentication fails, an Error is thrown.
 *
 * Remember to call this method before you start using this client. If you
 * create an instance of this client using provided DelugeClient.get() factory
 * function, auth is called for you.
 *
 * @returns {Promise.<DelugeClient>} - Self instance.
 */
DelugeClient.prototype.auth = function () {
    var client = this;
    return this.request('auth.login', [this.options.password])
        .then(function () {
            return client;
        });
};

/**
 * Add torrent.
 *
 * @param {string} metainfo - Base64 torrent data or a magnet link
 * @param {Object=} options
 * @returns {Promise.<string>} - Returns 'true' in case of success.
 */
DelugeClient.prototype.addTorrent = function (metainfo, options) {
    return this.request('webapi.add_torrent', [metainfo, options]);
};

/**
 * Get basic torrent information.
 *
 * @param {Array=} torrents - List of torrent hashes. If null, all torrents are returned.
 * @param {Array=} data - List of property names to be returned. If null, all data is fetched.
 * @returns {Promise.<*>}
 */
DelugeClient.prototype.getTorrents = function (torrents, data) {
    return this.request('webapi.get_torrents', [
        torrents || null,
        data || null
    ]);
};

/**
 * Get files of given torrent.
 *
 * @param torrentId - Torrent hash
 * @returns {Promise.<Object>}
 */
DelugeClient.prototype.getTorrentFiles = function (torrentId) {
    return this.request('web.get_torrent_files', [torrentId]);
};

/**
 * Get general information required for updating user interface.
 *
 * @param {Array=} data - List of torrent property names to be returned. If null, all data is fetched.
 * @param {Object=} filter - Filter definitions applied on torrents (i. e. { hash: 'abc...' })
 * @returns {Promise.<Object>}
 */
DelugeClient.prototype.updateUi = function (data, filter) {
    return this.request('web.update_ui', [
        data || ["name", "hash", "download_payload_rate", "upload_payload_rate", "eta", "progress"],
        filter || {}
    ]);
};

module.exports = DelugeClient;