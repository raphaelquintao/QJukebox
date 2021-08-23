const fetch = require("node-fetch");
const querystring = require('querystring');
const ytdl = require('ytdl-core');
const QJSong = require("./QJSong.js");

const {youtube_api_key} = require('./../config.json');

const youtube_api_playlist_base_url = 'https://youtube.googleapis.com/youtube/v3/playlistItems';
const youtube_api_video_base_url = 'https://youtube.googleapis.com/youtube/v3/videos';

async function get_video_details(ids, user) {
    let base_url = 'https://www.youtube.com/watch?v=';
    let qs = querystring.stringify({
        part: "snippet,contentDetails",
        id: ids.join(','),
        key: youtube_api_key
    });
    let data = await fetch(`${youtube_api_video_base_url}?${qs}`).then(r => r.json())
        .catch(reason => false);
    let infos = [];
    if (data && 'items' in data)
        for (let item of data.items) {
            let snippet = item.snippet;
            let details = item.contentDetails;
            
            let url = base_url + item.id;
            let title = snippet.title;
            let duration_str = details.duration;
            let match = duration_str.match(/PT(?:(?<h>\d*)H)?(?:(?<m>\d*)M)?(?<s>\d*)S?/);
            let hours = match.groups['h'] ? parseInt(match.groups['h']) * 60 : 0;
            let min = match.groups['m'] ? parseInt(match.groups['m']) * 60 : 0;
            let sec = match.groups['s'] ? parseInt(match.groups['s']) : 0;
            let duration = hours + min + sec;
            let info = new QJSong(title, '', url, duration, user, 'youtube');
            infos.push(info);
        }
    return infos;
}

async function parse_playlist(data, user) {
    let ids = [];
    for (let item of data.items) {
        let videoId = item.contentDetails.videoId;
        ids.push(videoId);
    }
    return await get_video_details(ids, user);
}

/**
 *
 * @param url
 * @param user
 * @return {Promise<*[]>}
 */
async function getInfo(url, user = '') {
    let match = url.match(/v=(?<video>[^&]+)(?:&list=(?<playlist>[^&]+))?/);
    
    let video = match.groups['video'];
    let playlist = match.groups['playlist'];
    
    if (playlist !== undefined) {
        let qs = querystring.stringify({
            part: "contentDetails",
            maxResults: 100,
            playlistId: playlist,
            key: youtube_api_key
        });
        let data = await fetch(`${youtube_api_playlist_base_url}?${qs}`).then(r => r.json());
        return parse_playlist(data, user)
    } else {
        return get_video_details([video], user);
    }
}

module.exports = qyoutube = {
    'getInfo': getInfo
}