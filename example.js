var DelugeClient = require('./');

var hash = '3e6d9dd3d9caa1b602bc1f758bd2c869fa05093f';
var magnet = 'magnet:?xt=urn:btih:3e6d9dd3d9caa1b602bc1f758bd2c869fa05093f&dn=How%20I%20Met%20Your%20Mother%20S09E23%20E24%20HDTV%20x264%20EXCELLENCE%20eztv&tr=udp%3A%2F%2Ftracker.openbittorrent.com%2Fannounce';
var options = {
    apiUrl: 'http://localhost:8112/json',
    password: 'deluge'
};

var client = new DelugeClient(options);
client.addTorrent(magnet, { download_location: '/home/data/torrents' });
setInterval(function () {
    client.updateUi(['download_payload_rate', 'progress'], {hash: '3e6d9dd3d9caa1b602bc1f758bd2c869fa05093f'})
        .then(function (uiState) {
            var torrent = uiState.torrents[hash];
            if (!torrent) {
                console.log('Torrent not found');
                return;
            }

            console.log('Download speed: %s B/s, Progress: %s %',
                torrent.download_payload_rate,
                torrent.progress);
        });
}, 500);