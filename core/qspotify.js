const fetch = require("node-fetch");
const querystring = require('querystring');
const Youtube = require('youtube-sr').default;
const QJSong = require("./QJSong.js");

const {spotify_client_id, spotify_client_secret, youtube_api_key} = require('./../config.json');

const spotify_api_token = 'https://accounts.spotify.com/api/token';
const spotify_api_playlist_base_url = 'https://api.spotify.com/v1/playlists';
const spotify_api_track_base_url = 'https://api.spotify.com/v1/tracks';
const spotify_api_artist_base_url = 'https://api.spotify.com/v1/artists';
const spotify_api_album_base_url = 'https://api.spotify.com/v1/albums';

async function get_token() {
    let encoded = Buffer.from(`${spotify_client_id}:${spotify_client_secret}`, 'ascii').toString('base64');
    let qs = querystring.stringify({
        grant_type: "client_credentials",
    });
    let data = await fetch(spotify_api_token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Authorization': 'Basic ' + encoded,
        },
        body: qs
    }).then(r => r.json()).catch(reason => []);
    if (data && 'access_token' in data) return data.access_token;
    return '';
}

async function parse_playlist(data, user) {
    let infos = [];
    for (let item of data.items) {
        let title = item.track.name;
        let duration = item.track.duration_ms / 1000;
        let artist = item.track.artists[0].name;
        let info = new QJSong(title, artist, false, duration, user, 'spotify');
        infos.push(info);
    }
    
    return infos;
}

async function parse_track(data, user) {
    let infos = [];
    for (let track of data.tracks) {
        let title = track.name;
        let duration = track.duration_ms / 1000;
        let artist = track.artists[0].name;
        let info = new QJSong(title, artist, false, duration, user, 'spotify');
        infos.push(info);
    }
    
    return infos;
}

async function parse_album(data, user) {
    let infos = [];
    for (let track of data.items) {
        let title = track.name;
        let duration = track.duration_ms / 1000;
        let artist = track.artists[0].name;
        let info = new QJSong(title, artist, false, duration, user, 'spotify');
        infos.push(info);
    }
    
    return infos;
}

async function getInfo(url, user = '') {
    let match = url.match(/https:\/\/open\.spotify\.com\/(?:playlist\/(?<playlist>[^?]+))?(?:track\/(?<track>[^?]+))?(?:artist\/(?<artist>[^?]+))?(?:album\/(?<album>[^?]+))?/);
    let {playlist, track, artist, album} = match.groups;
    
    let token = await get_token();
    
    if (playlist !== undefined) {
        let qs = querystring.stringify({
            limit: 100
        });
        let data = await fetch(`${spotify_api_playlist_base_url}/${playlist}/tracks?${qs}`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        }).then(r => r.json());
        return await parse_playlist(data, user);
    } else if (track !== undefined) {
        let qs = querystring.stringify({
            ids: track
        });
        let data = await fetch(`${spotify_api_track_base_url}?${qs}`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        }).then(r => r.json());
        
        return await parse_track(data, user);
    } else if (artist !== undefined) {
        let qs = querystring.stringify({
            market: 'us'
        });
        let data = await fetch(`${spotify_api_artist_base_url}/${artist}/top-tracks?${qs}`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        }).then(r => r.json());
    
        return await parse_track(data, user);
    } else if (album !== undefined) {
        let qs = querystring.stringify({
            market: 'us',
            limit: 50
        });
        let data = await fetch(`${spotify_api_album_base_url}/${album}/tracks?${qs}`, {
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        }).then(r => r.json());
    
        // return data;
        return await parse_album(data, user);
    }
}

module.exports = qspotify = {
    'getInfo': getInfo
}