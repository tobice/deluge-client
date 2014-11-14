require('superagent-bluebird-promise');
var request = require('superagent');
var _ = require('lodash');
var debug = require('debug')('deluge-client');

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
    this._agent = request.agent();
}

/**
 * Get Promise for the authentication request.
 * @returns {Promise}
 */
DelugeClient.prototype._getAuthPromise = function () {
    if (!this._authPromise) {
        this._authPromise = this._auth();
    }
    return this._authPromise;
};

/**
 * Perform API request.
 *
 * For complete list of supported methods see:
 * http://deluge-torrent.org/docs/master/modules/ui/web/json_api.html
 * http://deluge-webapi.readthedocs.org/en/latest/quickstart.html#api-methods
 *
 * Function automatically checks for errors and if request for some reason fails,
 * an Error is thrown. Promise doesn't return the whole response body, only
 * relevant result (which is usually parsed JSON object, but it can also be
 * a simple string like 'true' for example).
 *
 * @param {string} method - Method name, i. e. 'auth.login'
 * @param {Array} params - List of params
 * @param {boolean=} requireAuthentication - Request should be performed after
 *  successful authentication. The default value is true.
 * @returns {Promise.<*>} - Request result.
 */
DelugeClient.prototype.request = function (method, params, requireAuthentication) {
    // If authentication is required, first wait until the client is
    // authenticated and only then perform the request.
    if (requireAuthentication === undefined || requireAuthentication) {
        return this._getAuthPromise().then(function() {
            return this.request(method, params, false);
        }.bind(this));
    }

    debug('calling method "%s" with params: %j', method, params);
    return this._agent
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
            try {
                var json = JSON.parse(res.text);
            }
            catch (error) {
                throw new Error('Not a valid JSON response.' + error);
            }

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
 * @returns {Promise}
 */
DelugeClient.prototype._auth = function () {
    return this.request('auth.login', [this.options.password], false)
        .then(function (result) {
            // Deluge API does not return any error (the request looks like
            // a successful one) if the password is wrong. We have to check
            // the result value.
            if (result === false) {
                throw new Error('Authentication failed');
            }
            return result;
        })
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