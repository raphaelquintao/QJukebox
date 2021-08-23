const Discord = require('discord.js');
const {joinVoiceChannel, createAudioPlayer, AudioResource, createAudioResource, generateDependencyReport, AudioPlayerStatus, AudioPlayerPausedState} = require("@discordjs/voice");
const ytdl = require('ytdl-core');
const qyoutube = require("./core/qyoutube.js");
const qspotify = require("./core/qspotify.js");
const QJQueue = require("./core/QJQueue.js");
const {QJPlaylist, load_playlist, list_playlist} = require("./core/QJPlaylist.js");
const QJSong = require("./core/QJSong.js");

const {prefix, discord_token} = require('./config.json');

const VERSION = '1.0';

const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES
    ]
});

const queue = new Map();
const queue_messages = [];


client.once("ready", (ev) => {
    console.log("Ready!");
    console.log(generateDependencyReport());
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});

const cmds = [
    {name: 'about', description: 'Show about message'},
    {name: 'help', description: 'Show help message'},
    {name: 'ping', description: 'Do a ping test.'},
    {name: 'stop', description: 'Stops the song that is currently playing'},
    {name: 'pause', description: 'Pauses the song that is currently playing'},
    {name: 'unpause', description: 'Resume playback of the current song'},
    {name: 'skip', description: 'Skip to the next song in the queue'},
    {name: 'shuffle', description: 'Shufle songs'},
    {name: 'queue', description: 'See the music queue'},
    {name: 'clear', description: 'Clear the music queue'},
    
    {name: 'play', description: 'Add a song to the current playlist', options: [{name: 'song', type: 'STRING', description: 'The URL of the song to play', required: false}]},
    {name: 'remove', description: 'Remove song from current music queue', options: [{name: 'song', type: 'INTEGER', description: 'The id of the song in the queue', required: true}]},
    {name: 'jump', description: 'Jump to specific song in queue', options: [{name: 'song_id', type: 'INTEGER', description: 'The id of the song in the queue', required: true}]},
    {
        name: 'playlist',
        description: 'Show Saved Playlists',
        options: [{name: 'playlist_id', type: 'STRING', description: 'Loads a playlist', required: false}]
    },
    {
        name: 'playlist-save',
        description: 'Saves the current playlist',
        options: [{name: 'playlist_name', type: 'STRING', description: 'The new name of teh playlist', required: false}]
    },
    {
        name: 'playlist-create',
        description: 'Create a new playlist',
        options: [{name: 'playlist_name', type: 'STRING', description: 'The name of the new playlist', required: true}]
    },
    {
        name: 'playlist-delete',
        description: 'Delete a playlist',
        options: [{name: 'playlist_name', type: 'STRING', description: 'The name of the playlist to delete', required: true}]
    }
]




let commands = ['ping', 'play', 'stop', 'pause', 'unpause', 'skip', 'queue', 'shuffle', 'remove', 'clear', 'jump', 'playlist', 'help', 'about'];

client.on("messageCreate", async message => {
    // if (message.author.bot) return;
    // console.log(message);
    
    
    
    if (!message.content.startsWith(prefix)) return;
    
    let squeue = queue.get(message.guild.id);
    
    console.log(message.content);
    
    // const re = new RegExp(`^${prefix}(${commands.join('|')})(.*)`, 'i');
    let tmp = `^${prefix}\\b\(${commands.join('|')}\)\\b(.*)`;
    const re = new RegExp(`^${prefix}\\b\(${commands.join('|')}\)\\b(\\s[^\\s]+)?(\\s.*)?`, 'i');
    console.log(re);
    let match = message.content.match(re);
    console.log(match);
    // return;
    if (!match) return;
    let cmd = match[1].toLowerCase();
    let param = match[2] ? match[2].trim() : '';
    let param2 = match[3] ? match[3].trim() : '';
    
    console.log(cmd, param);
    console.log(message.guild.id);
    
    
    // if (!message.member.voice.channel) {
    //     message.channel.send({content: "You need to be in a vocie channel to send commands!"});
    // }
    
    if (!squeue) {
        console.log('Creating Server Queue!');
        const _queue = new QJQueue(message);
        await _queue.bind_events(message, async (a) => {
            _queue.messages_update(await show_queue(message, false));
        });
        queue.set(message.guild.id, _queue);
    }
    if (cmd === 'ping') {
        await message.guild.commands.set(cmds);
        await message.reply('Deployed!');
        // return message.channel.send({content: "Pong"});
    } else if (cmd === 'play') {
        return play_handler(message, param);
    } else if (cmd === 'stop') {
        return stop(message);
    } else if (cmd === 'shuffle') {
        return shuffle(message);
    } else if (cmd === 'remove') {
        return remove(message, param);
    } else if (cmd === 'clear') {
        return clear(message, param);
    } else if (cmd === 'pause') {
        return pause(message);
    } else if (cmd === 'jump') {
        return jump(message, param);
    } else if (cmd === 'playlist') {
        return await playlist(message, param, param2);
    } else if (cmd === 'queue') {
        return show_queue(message, squeue);
    } else if (cmd === 'skip') {
        return skip(message);
    } else if (cmd === 'about') {
        return about(message);
    } else {
        squeue.text_channel.send({content: "You need to enter a valid command!"});
    }
});

async function play_handler(message, param) {
    let squeue = queue.get(message.guild.id);
    
    // Parse song url and retrieve data.
    async function get_songs(url, user = '') {
        let match = url.trim().match(/^(?:https?:\/\/)(?<y>www\.youtube\.com)?(?<s>open\.spotify\.com)?/);
        if (!match) return false;
        let {y, s} = match.groups;
        
        if (y !== undefined) return qyoutube.getInfo(url, user);
        else if (s !== undefined) return qspotify.getInfo(url, user)
        
        return false;
    }
    
    if (param !== '') {
        let songs = await get_songs(param, message.member.displayName).catch(reason => false);
        if (!songs) return message.channel.send({content: "Invalid URL"});
        squeue.playlist.add(songs);
        message.channel.send({content: `${songs.length} new songs has been added to the queue!`});
        
        if (!squeue.playing) {
            let song = squeue.playlist.get(0);
            if (song) await song.play(squeue, message);
        }
    } else {
        unpause(message);
    }
}

async function remove(message, param) {
    let squeue = queue.get(message.guild.id);
    let index = parseInt(param);
    
    if (squeue.playing && squeue.playlist.current_index === index) return squeue.text_channel.send({content: `You cant remove the current playing song!`});
    
    if (squeue.playlist.size() === 0) return squeue.text_channel.send({content: `There's no song to remove!`});
    
    let curr = squeue.playlist.get_current();
    let prev = squeue.playlist.get_prev();
    let next = squeue.playlist.get_next();
    
    
    let removed = squeue.playlist.remove(index);
    
    if (curr === removed) {
        squeue.playlist.set_playing(next ? next : prev ? prev : null);
    } else if (squeue.playlist.current_index > index) {
        let previous = squeue.playlist.get(squeue.playlist.current_index - 1);
        squeue.playlist.set_playing(curr);
    }
    
    squeue.messages_update(await show_queue(message, false));
    
    await squeue.text_channel.send({content: `The song **${removed.title}** has been remove!`});
}

async function clear(message) {
    let squeue = queue.get(message.guild.id);
    
    squeue.playlist.clear();
    squeue.player.stop();
    
    squeue.messages_update(await show_queue(message, false));
    
    await squeue.text_channel.send({content: `The playlist has been cleared!`});
}

async function shuffle(message, notify = true) {
    let squeue = queue.get(message.guild.id);
    squeue.playlist.shuffle();
    squeue.messages_update(await show_queue(message, false));
    
    if (notify) squeue.text_channel.send({content: `Playlist has been shuffled!`});
}

async function prev(message, notify) {
    let squeue = queue.get(message.guild.id);
    let song = squeue.playlist.get_prev();
    if (!song) return false;
    if (song) {
        await song.play(squeue, message, notify);
        squeue.messages_update(await show_queue(message, false));
    }
}

async function next(message, notify) {
    let squeue = queue.get(message.guild.id);
    let song = squeue.playlist.get_next();
    if (!song) return false;
    if (song) {
        await song.play(squeue, message, notify);
        squeue.messages_update(await show_queue(message, false));
    }
}

async function jump(message, index) {
    let squeue = queue.get(message.guild.id);
    if (!index) return squeue.text_channel.send({content: `A song ID is rquired!`});
    let song = squeue.playlist.get(index);
    if (!song) return squeue.text_channel.send({content: `Invalid song ID: ${index}`});
    if (song) {
        await song.play(squeue, message);
        squeue.messages_update(await show_queue(message, false));
    }
}

async function skip(message) {
    let squeue = queue.get(message.guild.id);
    
    if (!message.member.voice.channel) return squeue.text_channel.send({content: "You have to be in a voice channel to stop the music!"});
    if (!squeue) return squeue.text_channel.send({content: "There is no song that I could skip!"});
    
    let next_song = squeue.playlist.get_next();
    if (next_song) {
        await next_song.play(squeue, message);
        squeue.messages_update(await show_queue(message, false));
    }
}

async function stop(message) {
    let squeue = queue.get(message.guild.id);
    if (!message.member.voice.channel) return squeue.text_channel.send({content: "You have to be in a voice channel to stop the music!"});
    
    if (!squeue) return squeue.text_channel.send("There is no song that I could stop!");
    
    squeue.player.pause();
    squeue.messages_update(await show_queue(message, false));
}

async function pause(message) {
    let squeue = queue.get(message.guild.id);
    if (!message.member.voice.channel) return squeue.text_channel.send({content: "You have to be in a voice channel to stop the music!"});
    
    if (!squeue) return message.channel.send("There is no song that I could stop!");
    
    squeue.player.pause();
    squeue.messages_update(await show_queue(message, false));
}

async function unpause(message) {
    let squeue = queue.get(message.guild.id);
    if (!message.member.voice.channel) return squeue.text_channel.send({content: "You have to be in a voice channel to stop the music!"});
    
    if (!squeue) return squeue.text_channel.send("There is no song that I could stop!");
    
    if (!squeue.playing) {
        if (squeue.player.state.status === 'paused') {
            squeue.player.unpause();
            return;
        }
        let song = squeue.playlist.get_current();
        if (song) song.play(squeue, message);
        else return squeue.text_channel.send({content: "There's no songs on queue to play!"});
        squeue.messages_update(await show_queue(message, false));
    }
}

async function playlist(message, action, action2) {
    let squeue = queue.get(message.guild.id);
    let playlists_names = list_playlist(message.guild.id);
    
    if (action === '') {
        let msg = '';
        let options = [];
        for (const key in playlists_names) {
            let playlist_name = playlists_names[key];
            let index = ("0000" + (parseInt(key))).substr(-3);
            let playlist = load_playlist(message.guild.id, playlist_name);
            
            options.push({label: playlist_name, value: index});
            msg += `\`${index}\` - ${playlist_name} - ${playlist.size()} Songs\n`;
            
        }
        const embed = new Discord.MessageEmbed();
        embed.title = 'QJukebox - Playlists';
        // embed.setDescription(msg);
        const row = new Discord.MessageActionRow();
        let playlist_select = new Discord.MessageSelectMenu({customId: 'playlist_select', placeholder: 'Select a playlist to load'});
        playlist_select.addOptions(options)
        row.addComponents(playlist_select);
        
        return squeue.text_channel.send({content: '**Playlists:**', components: [row]});
        
    } else if (action === 'save') {
        
        squeue.playlist.save(action2);
        return message.channel.send({content: `PLaylist **${action2}** saved!`});
    } else {
        let index = parseInt(action);
        if (isNaN(index)) return;
        if (index > playlists_names.length) return squeue.text_channel.send('Invalid Playlist ID');
        let playlist_name = playlists_names[index];
        console.log(playlist_name);
        let playlist = load_playlist(message.guild.id, playlist_name);
        let squeue = queue.get(message.guild.id);
        squeue.playlist = playlist;
        
        let song = squeue.playlist.get(0);
        await song.play(squeue, message);
        // console.log()
        
        squeue.messages_update(await show_queue(message, false));
    }
    
}

async function show_queue(message, send = true) {
    let squeue = queue.get(message.guild.id);
    
    if (!squeue) {
        return message.channel.send({content: "There is no song on queue!"});
    }
    
    
    let playlist = squeue.playlist;
    let current = playlist.current_index;
    
    
    let msg = '';
    
    for (let key = 0; key < playlist.size(); key++) {
        let index = ("0000" + (key)).substr(-3);
        let tmp_msg = `\`${index}\` - ${playlist.get(key).get_str()}\n`;
        if (key === current) {
            msg += `⬐\n`;
            msg += `${tmp_msg}`;
            msg += `⬑\n`;
        } else {
            msg += tmp_msg;
        }
    }
    if (msg === '') msg = 'Queue is empty!';
    
    const row = new Discord.MessageActionRow()
    let btn_update = new Discord.MessageButton({customId: 'update', label: 'update', style: 'SECONDARY'});
    let btn_shuffle = new Discord.MessageButton({customId: 'shuffle', label: 'shuffle', style: 'SECONDARY'});
    let btn_prev = new Discord.MessageButton({customId: 'prev', label: 'Previous Song', style: 'SECONDARY', disabled: !squeue.playlist.get_prev()});
    let btn_next = new Discord.MessageButton({customId: 'next', label: 'Next Song', style: 'SECONDARY', disabled: !squeue.playlist.get_next()});
    
    let btn_play_pause = new Discord.MessageButton({customId: 'play_pause', style: 'SECONDARY'});
    
    btn_play_pause.setDisabled(squeue.playlist.size() === 0);
    if (squeue.playing) {
        btn_play_pause.setLabel('Pause');
    } else {
        btn_play_pause.setLabel('Play');
    }
    
    // row.addComponents(btn_update);
    row.addComponents(btn_shuffle);
    row.addComponents(btn_prev);
    row.addComponents(btn_play_pause);
    row.addComponents(btn_next);
    
    
    const embed = new Discord.MessageEmbed();
    embed.setColor('#8c223e');
    embed.setTitle('QJukebox - Playlist: ' + playlist.name);
    // embed.setAuthor('Quintao');
    // embed.setFooter(row);
    embed.setDescription(msg);
    
    if (send) {
        let last_message = await squeue.text_channel.send({embeds: [embed], components: [row]});
        squeue.messages_add(last_message);
        return;
    }
    
    return {embeds: [embed], components: [row]};
}

client.on('interactionCreate', async interaction => {
    let squeue = queue.get(interaction.guild.id);
    if (interaction.isButton()) {
        if (interaction.customId === 'update') {
            // interaction.update(await show_queue(interaction.message, false));
        } else if (interaction.customId === 'play_pause') {
            if (squeue.playing) {
                await pause(interaction);
            } else {
                await play_handler(interaction, '');
            }
        } else if (interaction.customId === 'shuffle') {
            await shuffle(interaction, false);
        } else if (interaction.customId === 'prev') {
            await prev(interaction, false);
            // interaction.update(await show_queue(interaction.message, false));
        } else if (interaction.customId === 'next') {
            await next(interaction, false);
            // interaction.update(await show_queue(interaction.message, false));
        }
        interaction.update(await show_queue(interaction.message, false));
    }else if (interaction.isSelectMenu()){
        if (interaction.customId === 'playlist_select') {
            let index = parseInt(interaction.values[0]);
            console.log(interaction.values[0]);
            playlist(interaction.message, index);
            await interaction.update({});
        }
    }
    squeue.messages_update(await show_queue(interaction.message, false));
    
    // console.log(interaction);
});


function about(message) {
    let msg = 'Just another Discord music bot, but done the right way!\n\n' +
        'If you use and like this Bot you can give it a star on [GitHub](https://github.com/raphaelquintao/QJukebox)\n\n' +
        'Buy me a Coffee:\n' +
        '- [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=ZLHQD3GQ5YNR6&source=url)\n' +
        '- Bitcoin: `1NaiaFcVGrrMs9amjyb4aVV1dJoLfdKe3Q`\n\n';
    
    msg += 'Copyright 2021, [Raphael Quintao](https://github.com/raphaelquintao)';
    
    const embed = new Discord.MessageEmbed();
    embed.setColor('#b32e51');
    // embed.setAuthor(`QJukebox - ${VERSION}`);
    embed.setTitle(`QJukebox - ${VERSION}`);
    embed.setDescription(msg);
    return message.reply({embeds: [embed]});
}

function help(message) {

}


// Main Loop
client.login(discord_token).catch(reason => {
    console.log('Error: ', reason)
});