const Discord = require('discord.js');
const {joinVoiceChannel, createAudioPlayer, AudioResource, AudioPlayer, createAudioResource, generateDependencyReport, AudioPlayerStatus} = require("@discordjs/voice");
const {QJPlaylist} = require("./QJPlaylist.js");
const QJConfig = require("./QJConfig.js");

class QJQueue {
    /** @type {Discord.Guild} */
    guild = null;
    text_channel = null;
    voice_channel = null;
    voice_connection = null;
    /** @type {AudioPlayer} */
    player;
    /** @type {QJPlaylist} */
    playlist;
    qmessages;
    pmessages;
    on_next_song;
    /** @type {QJConfig} */
    configs;
    retries = 3;
    _tries = 0;
    
    
    constructor(guild, text_channel, voice_channel) {
        this.guild = guild;
        this.text_channel = text_channel;
        this.voice_channel = voice_channel;
        this.player = createAudioPlayer();
        this.playlist = new QJPlaylist(`${guild.id}`);
        this.qmessages = []
        this.pmessages = []
        this.configs = new QJConfig(`${guild.id}`);
    }
    
    async bind_events() {
        // Handle player events
        this.player.on('subscribe', sub => {
            console.log('Subscribed!');
        });
        this.player.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
            console.log('Idle');
            let next_song;
            if (this._tries === 0) {
                next_song = this.playlist.get_next();
            } else {
                next_song = this.playlist.get_current();
                if (this._tries >= this.retries) this._tries = 0;
            }
            
            if (next_song) {
                await next_song.play(this);
                if(this.on_next_song) await this.on_next_song;
                this._tries = 0;
            } else if (this.configs.loop) {
                let song = this.playlist.get(0);
                if (song) {
                    await song.play(this);
                    if(this.on_next_song) await this.on_next_song;
                }
            }
        });
        this.player.on(AudioPlayerStatus.Paused, sub => {
            console.log('Paused');
        });
        this.player.on(AudioPlayerStatus.AutoPaused, sub => {
            console.log('AutoPaused');
        });
        this.player.on('error', error => {
            let song = this.playlist.get_current();
            this._tries++;
            this.text_channel.send({content: `Failed to load song: ${song.title}\nTries: ${this.tries}`});
        });
    }
    
    get playing() {
        return (this.player.state.status === 'playing' || this.player.state.status === 'buffering');
    }
    
    qmessages_add(message) {
        this.qmessages.push(message);
    }
    
    qmessages_update(data) {
        for (const qmessage of this.qmessages) {
            qmessage.edit(data);
        }
    }
    
    pmessages_add(message) {
        this.pmessages.push(message);
    }
    
    pmessages_update(data) {
        for (const pmessage of this.pmessages) {
            pmessage.edit(data);
        }
    }
}

module.exports = QJQueue;