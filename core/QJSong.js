import ytdl from "ytdl-core";
import ytdld from "discord-ytdl-core";
import { YouTube } from "youtube-sr";

import { createAudioResource, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";


async function search_on_youtube(title, artist) {
    let video = await YouTube.searchOne(`"${title} ${artist}"`, 'video').catch(err => false);
    if (!video) video = await YouTube.searchOne(`"${artist} ${title}"`, 'video').catch(err => false);
    if (!video) video = await YouTube.searchOne(`${title}`, 'video').catch(err => false);
    
    return video;
}

export function load_song(data) {
    return new QJSong(data.title, data.artist, data.url, data.duration, data.added_by, data.source);
}

export default class QJSong {
    title;
    artist;
    url;
    duration;
    added_by;
    source;
    fails;
    
    
    constructor(title, artist, url, duration, added_by, source) {
        this.title = title;
        this.artist = artist;
        this.url = url;
        this.duration = duration;
        this.added_by = added_by;
        this.source = source;
        this.fails = 0;
    }
    
    
    get_duration_str() {
        let duration = parseInt(this.duration);
        if (duration === 0) return "\u221E";
        let min = Math.trunc(duration / 60);
        let sec = ((duration - min * 60) + "0").substring(0, 2);
        return `${min}:${sec}`;
    }
    
    
    get_str() {
        let title = `${this.title}`;
        
        if (this.artist) {
            title = title.slice(0, 40);
            if (this.fails > 0) title = `~~${title}~~`;
            title = `${title} - ${this.artist}`.slice(0, 70);
        } else {
            title = title.slice(0, 70);
            if (this.fails > 0) title = `~~${title}~~`;
        }
        
        
        return `${title} - ${this.get_duration_str()}`;
    }
    
    
    async download() {
        if (!this.url) {
            let video = await search_on_youtube(this.title, this.artist);
            this.url = video.url;
        }
        
        // return ytdl(this.url);
        return ytdl(this.url, {filter: 'audioonly'});
        // return ytdl(this.url, {filter: format => format.container === 'mp4' && format.audioQuality === 'AUDIO_QUALITY_MEDIUM'});
        // return ytdld(this.url, {filter: "audioonly", opusEncoded: false});
    }
    
    /**
     * Play this song
     * @param {QJQueue} squeue The server queue
     * @param message The message
     * @param {boolean} notify
     * @return {Promise<void>}
     */
    async play(squeue, message, notify = true) {
        squeue.playlist.set_playing(this);
        
        if(squeue.stoped) return;
        
        if (!squeue.voice_connection || squeue.voice_connection.state.status === VoiceConnectionStatus.Disconnected) {
            squeue.voice_connection = await joinVoiceChannel({channelId: squeue.voice_channel.id, guildId: squeue.guild.id, adapterCreator: squeue.guild.voiceAdapterCreator});
            squeue.voice_connection.subscribe(squeue.player);
        }
        
        let audio = createAudioResource(await this.download(), {inlineVolume: true});
        audio.volume.setVolume(1);
        squeue.audio = audio;
        squeue.player.play(audio);
        
        if (notify && squeue.configs.notify) await squeue.text_channel.send({content: `Start Playing: "${this.title}"`});
    }
}
