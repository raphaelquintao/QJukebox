import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioPlayer } from "@discordjs/voice";
import QJConfig from "./QJConfig.js";
import QJPlaylist from "./QJPlaylist.js";


export default class QJQueue {
    /** @type {Discord.Guild} */
    guild = null;
    text_channel = null;
    voice_channel = null;
    voice_connection = null;
    /** @type {AudioResource} */
    audio;
    /** @type {AudioPlayer} */
    player;
    /** @type {QJPlaylist} */
    playlist;
    qmessages;
    pmessages;
    on_next_song = null;
    /** @type {QJConfig} */
    configs;
    stoped = false;
    
    
    constructor(guild, text_channel, voice_channel) {
        this.guild = guild;
        this.text_channel = text_channel;
        this.voice_channel = voice_channel;
        this.player = createAudioPlayer();
        this.playlist = new QJPlaylist(`${guild.id}`);
        this.qmessages = []
        this.pmessages = []
        this.configs = new QJConfig(`${guild.id}`, guild.name);
    }
    
    async bind_events() {
        // Handle player events
        this.player.on('subscribe', sub => {
            console.log('Subscribed!');
        });
        this.player.on(AudioPlayerStatus.Idle, async (oldState, newState) => {
            console.log('Idle');
            
            if (this.stoped) return;
            
            let next_song = this.playlist.get_next();
            
            if (next_song) {
                await next_song.play(this);
                if (this.on_next_song) await this.on_next_song();
            } else if (this.configs.loop) {
                let song = this.playlist.get(0);
                if (song) {
                    await song.play(this);
                    if (this.on_next_song) await this.on_next_song();
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
            song.fails++;
            if (this.configs.debug)
                this.text_channel.send({content: `Failed to load song: ${song.title}`});
        });
    }
    
    get playing() {
        return (this.player.state.status === 'playing' || this.player.state.status === 'buffering');
    }
    
    qmessages_add(message) {
        this.qmessages.push(message);
    }
    
    async qmessages_update(data) {
        for (let i = this.qmessages.length - 1, c = 0; i >= 0, c < 5; i--, c++) {
            // if (this.qmessages.length - 1 < c) break;
            let qmessage = this.qmessages[i];
            if (!qmessage) break;
            await qmessage.edit(data).catch(reason => {
                console.log('Failed to edit');
                // this.qmessages.splice(i);
            });
        }
    }
    
    qmessage_find_by_id(id) {
        return this.qmessages.find(value => value.id === id);
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

