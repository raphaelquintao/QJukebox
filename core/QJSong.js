// const ytdl = require('ytdl-core');
const ytdl = require('discord-ytdl-core');
const Youtube = require('youtube-sr').default;
const Discord = require("discord.js");
const {AudioPlayer, createAudioResource, joinVoiceChannel} = require("@discordjs/voice");

async function search_on_youtube(title, artist) {
    let video = await Youtube.searchOne(`${title} ${artist}`).catch(err => false);
    if (!video) video = await Youtube.searchOne(`${artist} ${title}`).catch(err => false);
    if (!video) video = await Youtube.searchOne(`${title}`).catch(err => false);
    
    return video;
}

function load_song(data) {
    return new QJSong(data.title, data.artist, data.url, data.duration, data.added_by, data.source);
}

class QJSong {
    title;
    artist;
    url;
    duration;
    added_by;
    source;
    
    
    constructor(title, artist, url, duration, added_by, source) {
        this.title = title;
        this.artist = artist;
        this.url = url;
        this.duration = duration;
        this.added_by = added_by;
        this.source = source;
    }
    
    
    get_duration_str() {
        let duration = parseInt(this.duration);
        let min = Math.trunc(duration / 60);
        let sec = ((duration - min * 60) + "0").substring(0, 2);
        return `${min}:${sec}`;
    }
    
    
    get_str() {
        if (this.artist) {
            let tmp = `${this.title.slice(0, 40)} - ${this.artist}`;
            return `${tmp.slice(0, 70)} - ${this.get_duration_str()}`;
        }
        return `${this.title.slice(0, 70)} - ${this.get_duration_str()}`;
    }
    
    
    async download() {
        if (!this.url) {
            let video = await search_on_youtube(this.title, this.artist);
            this.url = video.url;
        }
        // return ytdl(this.url, {filter: "audioonly"});
        return ytdl(this.url, {filter: "audioonly", opusEncoded: true});
    }
    
    /**
     * Play this song
     * @param {QJQueue} squeue The server queue
     * @param message The message
     * @param {boolean} notify
     * @return {Promise<void>}
     */
    async play(squeue, message, notify = true) {
        // if (!message.member.voice.channel) {
        //     return message.channel.send({content: "You need to be in a voice channel play a song!"});
        // }
        if (!squeue.voice_connection) {
            squeue.voice_connection = await joinVoiceChannel({channelId: squeue.voice_channel.id, guildId: squeue.guild.id, adapterCreator: squeue.guild.voiceAdapterCreator});
            squeue.voice_connection.subscribe(squeue.player);
        }
        
        squeue.player.play(createAudioResource(await this.download()));
        squeue.playlist.set_playing(this);
        
        if (notify && squeue.configs.notify) await squeue.text_channel.send({content: `Start Playing: **${this.title}**`});
    }
}

module.exports = QJSong;
module.exports.load_song = load_song;