const Discord = require('discord.js');
const {joinVoiceChannel, createAudioPlayer, AudioResource, AudioPlayer, createAudioResource, generateDependencyReport, AudioPlayerStatus} = require("@discordjs/voice");
const {QJPlaylist} = require("./QJPlaylist.js");

class QJQueue {
    text_channel = null;
    voice_connection = null;
    /** @type {AudioPlayer} */
    player;
    /** @type {QJPlaylist} */
    playlist;
    qmessages;
    loop = false;
    notify = true;
    
    
    constructor(message, notify = false,) {
        this.text_channel = message.channel;
        this.player = createAudioPlayer();
        this.playlist = new QJPlaylist(`${message.guild.id}`);
        this.qmessages = []
        this.notify = notify;
    }
    
    async bind_events(message, on_next_song) {
        // Handle player events
        this.player.on('subscribe', sub => {
            console.log('Subscribed!');
        });
        this.player.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
            console.log('Idle');
            let next_song = this.playlist.get_next();
            if (next_song) {
                await next_song.play(this, message);
                await on_next_song();
            } else if (this.loop) {
                let song = this.playlist.get(0);
                if (song) {
                    await song.play(this.player, this.text_channel);
                    await on_next_song();
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
            message.channel.send({content: "Failed to Load Song! " + "\n" + error});
        });
    }
    
    get playing() {
        return (this.player.state.status === 'playing' || this.player.state.status === 'buffering');
    }
    
    messages_add(message) {
        this.qmessages.push(message);
    }
    
    messages_update(data) {
        for (const qmessage of this.qmessages) {
            qmessage.edit(data);
        }
    }
}

module.exports = QJQueue;