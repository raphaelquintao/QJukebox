const Discord = require('discord.js');
const {SlashCommandBuilder} = require('@discordjs/builders');
// const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const {joinVoiceChannel, createAudioPlayer, AudioResource, createAudioResource, generateDependencyReport, AudioPlayerStatus, AudioPlayerPausedState} = require("@discordjs/voice");
const ytdl = require('ytdl-core');
const qyoutube = require("./core/qyoutube.js");
const qspotify = require("./core/qspotify.js");
const QJQueue = require("./core/QJQueue.js");
const {QJPlaylist, load_playlist, list_playlist} = require("./core/QJPlaylist.js");
const QJSong = require("./core/QJSong.js");
const {qprint} = require("./core/QUtils.js");
const {REST} = require("@discordjs/rest");


const {text_channel, voice_channel, prefix, discord_client_id, discord_token} = require('./config.json');

const VERSION = '1.0';

const client = new Discord.Client({
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        Discord.Intents.FLAGS.GUILD_INTEGRATIONS
    ]
});

const queue = new Map();

const cmds2 = [
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
];

let cmds = [
    new SlashCommandBuilder().setName('about').setDescription('Show about message'),
    new SlashCommandBuilder().setName('play').setDescription('Add a song to the current queue and start playing')
        .addStringOption(option => option.setName('song').setDescription('A link for a song').setRequired(false)),
    new SlashCommandBuilder().setName('stop').setDescription('Stops the music'),
    new SlashCommandBuilder().setName('pause').setDescription('Pauses the player'),
    new SlashCommandBuilder().setName('unpause').setDescription('Unpauses the player'),
    new SlashCommandBuilder().setName('skip').setDescription('Skip to the next song'),
    new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue'),
    new SlashCommandBuilder().setName('loop').setDescription('Queue loop')
        .addStringOption(option => option.setName('mode').setDescription('The new looping mode').setRequired(true)
            .addChoice('Enabled', 'enabled').addChoice('Disabled', 'disabled')),
    new SlashCommandBuilder().setName('clear').setDescription('Clears the queue'),
    new SlashCommandBuilder().setName('queue').setDescription('Display the current queue and controls'),
    new SlashCommandBuilder().setName('remove').setDescription('Remove the specified song from current queue')
        .addIntegerOption(option => option.setName('index').setDescription('The position of the song you want to remove').setRequired(true)),
    new SlashCommandBuilder().setName('jump').setDescription('Jump to specified song in the current queue')
        .addIntegerOption(option => option.setName('index').setDescription('The position of the song you want to jump to').setRequired(true)),
    new SlashCommandBuilder().setName('notify').setDescription('Toggles whether QJukebox will announce when a new song start playing')
        .addStringOption(option => option.setName('mode').setDescription('The new notify mode').setRequired(true)
            .addChoice('Enabled', 'enabled').addChoice('Disabled', 'disabled')),

];


function register_commands(guildId) {
    const rest = new REST({version: '9'}).setToken(discord_token);
    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');
            
            await rest.put(
                Routes.applicationGuildCommands(discord_client_id, guildId),
                {body: cmds},
            );
            
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
}

client.once("ready", async (ev) => {
    qprint('-> Ready!', 'lgreen', true);
    // console.log(generateDependencyReport());
    
    for (const g of client.guilds.cache) {
        let guild = g[1];
        // if (guild.id !== '877017433884479569') continue;
        if (guild.id === '485942602814717973') continue;
        let squeue = queue.get(guild.id);
        
        register_commands(guild.id);
        
        let _text_channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === text_channel.toLowerCase() && channel.type === "GUILD_TEXT");
        let _voice_channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === voice_channel.toLowerCase() && channel.type === "GUILD_VOICE");
        
        if (_text_channel)
            _text_channel.messages.fetch().then(async messages => {
                // console.log(messages);
                
                messages.forEach(message => {
                    message.delete();
                    // if (message.author.bot === true && message.author.username === 'QJukebox') {
                    //     message.delete();
                    // }
                });
                
            });
        
        if (!squeue) {
            qprint('-> Creating server queue for: ', '', false, '');
            qprint(`${guild.name} `, 'blue', false, '');
            qprint(guild.id, '', false);
            
            squeue = new QJQueue(guild, _text_channel, _voice_channel);
            await squeue.bind_events();
            queue.set(guild.id, squeue);
        }
    }
    
    
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});





let commands = ['ping', 'play', 'stop', 'pause', 'unpause', 'skip', 'queue', 'shuffle', 'remove', 'clear', 'jump', 'playlist', 'help', 'about'];

client.on("messageCreate", async message => {
    if (!message.content.startsWith(prefix)) return;
    
    console.log(message.content);
    
    const re = new RegExp(`^${prefix}\\b\(?<cmd>${commands.join('|')}\)\\b(?:\\s(?<p1>[^\\s]+))?(?:\\s(?<p2>.+))?`, 'i');
    console.log(re);
    let match = message.content.match(re);
    console.log(match);
    // return;
    if (!match) return;
    let {cmd, p1, p2} = match.groups;
    cmd = cmd.toLowerCase();
    
    
    // console.log(cmd, p1);
    console.log(message.guild.id);
    
    // Create Default Channels
    let _text_channel = message.guild.channels.cache.find(channel => channel.name.toLowerCase() === text_channel.toLowerCase() && channel.type === "GUILD_TEXT");
    let _voice_channel = message.guild.channels.cache.find(channel => channel.name.toLowerCase() === voice_channel.toLowerCase() && channel.type === "GUILD_VOICE");
    
    if (!_text_channel) _text_channel = await message.guild.channels.create(text_channel, {type: "GUILD_TEXT"});
    if (!_voice_channel) _voice_channel = await message.guild.channels.create(voice_channel, {type: "GUILD_VOICE"});
    
    
    // Only allow command for specific channel
    if (message.channel.name.toLowerCase() !== text_channel.toLowerCase()) {
        return;
    }
    
    // Creating Queue
    let squeue = queue.get(message.guild.id);
    if (!squeue) {
        console.log('Creating Server Queue!');
        squeue = new QJQueue(message.guild, _text_channel, _voice_channel);
        await squeue.bind_events();
        queue.set(message.guild.id, squeue);
    }
    if (!squeue.text_channel) squeue.text_channel = _text_channel;
    if (!squeue.voice_channel) squeue.voice_channel = _voice_channel;
    if (!squeue.on_next_song) {
        squeue.on_next_song = async (a) => {
            squeue.qmessages_update(await show_queue(message, false));
        }
    }
    
    
    // Handling Commands
    if (cmd === 'ping') {
        // await message.guild.commands.set(cmds);
        // await message.reply('Deployed!');
        return squeue.text_channel.send({content: "Pong"});
    } else if (cmd === 'play') {
        return play_handler(message, p1);
    } else if (cmd === 'stop') {
        return stop(message);
    } else if (cmd === 'shuffle') {
        return shuffle(message);
    } else if (cmd === 'remove') {
        return remove(message, p1);
    } else if (cmd === 'clear') {
        return clear(message, p1);
    } else if (cmd === 'pause') {
        return pause(message);
    } else if (cmd === 'jump') {
        return jump(message, p1);
    } else if (cmd === 'playlist') {
        return await playlist(message, p1, p2);
    } else if (cmd === 'queue') {
        return show_queue(message, true);
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
        if (!songs) return text_channel.send({content: "Invalid URL"});
        squeue.playlist.add(songs);
        squeue.text_channel.send({content: `${songs.length} new songs has been added to the queue!`});
        
        if (!squeue.playing) {
            let song = squeue.playlist.get(0);
            if (song) await song.play(squeue, message);
        }
        
        squeue.qmessages_update(await show_queue(message, false));
        
    } else {
        await unpause(message);
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
    
    squeue.qmessages_update(await show_queue(message, false));
    
    await squeue.text_channel.send({content: `The song **${removed.title}** has been remove!`});
}

async function clear(message) {
    let squeue = queue.get(message.guild.id);
    
    squeue.playlist.clear();
    squeue.player.stop();
    
    squeue.qmessages_update(await show_queue(message, false));
    
    await squeue.text_channel.send({content: `The playlist has been cleared!`});
}

async function shuffle(message, notify = true) {
    let squeue = queue.get(message.guild.id);
    squeue.playlist.shuffle();
    squeue.qmessages_update(await show_queue(message, false));
    
    if (notify) squeue.text_channel.send({content: `Playlist has been shuffled!`});
}

async function prev(message, notify) {
    let squeue = queue.get(message.guild.id);
    let song = squeue.playlist.get_prev();
    if (!song) return false;
    if (song) {
        await song.play(squeue, message, notify);
        squeue.qmessages_update(await show_queue(message, false));
    }
}

async function next(message, notify) {
    let squeue = queue.get(message.guild.id);
    let song = squeue.playlist.get_next();
    if (!song) return false;
    if (song) {
        await song.play(squeue, message, notify);
        squeue.qmessages_update(await show_queue(message, false));
    }
}

async function jump(message, index) {
    let squeue = queue.get(message.guild.id);
    if (!index) return squeue.text_channel.send({content: `A song ID is rquired!`});
    let song = squeue.playlist.get(index);
    if (!song) return squeue.text_channel.send({content: `Invalid song ID: ${index}`});
    if (song) {
        await song.play(squeue, message);
        squeue.qmessages_update(await show_queue(message, false));
    }
}

async function skip(message) {
    let squeue = queue.get(message.guild.id);
    
    if (!message.member.voice.channel) return squeue.text_channel.send({content: "You have to be in a voice channel to stop the music!"});
    if (!squeue) return squeue.text_channel.send({content: "There is no song that I could skip!"});
    
    let next_song = squeue.playlist.get_next();
    if (next_song) {
        await next_song.play(squeue, message);
        squeue.qmessages_update(await show_queue(message, false));
    }
}

async function stop(message) {
    let squeue = queue.get(message.guild.id);
    if (!message.member.voice.channel) return squeue.text_channel.send({content: "You have to be in a voice channel to stop the music!"});
    
    if (!squeue) return squeue.text_channel.send("There is no song that I could stop!");
    
    squeue.player.pause();
    squeue.qmessages_update(await show_queue(message, false));
}

async function pause(message) {
    let squeue = queue.get(message.guild.id);
    if (!message.member.voice.channel) return squeue.text_channel.send({content: "You have to be in a voice channel to stop the music!"});
    
    if (!squeue) return text_channel.send("There is no song that I could stop!");
    
    squeue.player.pause();
    squeue.qmessages_update(await show_queue(message, false));
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
        if (song) await song.play(squeue, message);
        else return squeue.text_channel.send({content: "There's no songs on queue to play!"});
        squeue.qmessages_update(await show_queue(message, false));
    }
}

async function playlist(message, action, action2) {
    let squeue = queue.get(message.guild.id);
    let playlists_names = list_playlist(message.guild.id);
    
    if (action === '') {
        await show_queue(message, true);
        
    } else if (action === 'save') {
        squeue.playlist.save(action2);
        squeue.qmessages_update(await show_queue(message, false));
        return squeue.text_channel.send({content: `Playlist **${action2}** saved!`});
        
    } else {
        let index = parseInt(action);
        if (isNaN(index)) return;
        if (index > playlists_names.length) return squeue.text_channel.send('Invalid Playlist ID');
        let playlist_name = playlists_names[index];
        console.log(playlist_name);
        let playlist = load_playlist(message.guild.id, playlist_name);
        let squeue = queue.get(message.guild.id);
        squeue.configs.playlist_selected = index;
        squeue.playlist = playlist;
        
        let song = squeue.playlist.get(0);
        await song.play(squeue, message);
        // console.log()
        
        squeue.qmessages_update(await show_queue(message, false));
    }
    
}

async function playlist_show(message, send = true) {
    let squeue = queue.get(message.guild.id);
    let playlists_names = list_playlist(message.guild.id);
    
    let msg = '';
    let options = [];
    let playlists = [];
    for (const key in playlists_names) {
        let playlist_name = playlists_names[key];
        let index = ("0000" + (parseInt(key))).substr(-3);
        let playlist = load_playlist(message.guild.id, playlist_name);
        playlists.push(playlist);
        
        options.push({label: playlist_name, description: `${playlist.size()} Songs\n`, value: index});
        msg += `\`${index}\` - ${playlist_name} - ${playlist.size()} Songs\n`;
        
    }
    const embed = new Discord.MessageEmbed();
    embed.title = 'QJukebox - Playlists';
    // embed.setDescription(msg);
    const row = new Discord.MessageActionRow();
    let playlist_select = new Discord.MessageSelectMenu({customId: 'playlist_select', placeholder: 'Select a playlist to load'});
    
    if (squeue.configs.playlist_selected > -1) {
        let selected = playlists[squeue.configs.playlist_selected];
        playlist_select.setPlaceholder(selected.name);
    }
    console.log('OK:', options.length);
    if (options.length === 0) {
        options.push({label: "No playlists", description: '', value: '0'});
        playlist_select.setPlaceholder('No playlist');
        playlist_select.setDisabled(true);
    }
    
    playlist_select.addOptions(options);
    
    
    
    row.addComponents(playlist_select);
    
    
    let data = {content: '**Playlists:**', components: [row]};
    
    if (send) {
        let last_message = squeue.text_channel.send(data);
        squeue.pmessages_add(last_message);
        return;
    }
    
    return data;
}

async function show_queue(message, send = true) {
    let squeue = queue.get(message.guild.id);
    if (!squeue) return text_channel.send({content: "There is no song on queue!"});
    
    
    let playlist = squeue.playlist;
    let current = playlist.current_index;
    
    
    let size = playlist.size();
    let page = playlist.current_page;
    let page_size = playlist.page_size;
    
    let pages = playlist.pages;
    
    let c = `${size}`.length;
    
    let msg = '';
    
    for (let key = page * page_size; key < (page + 1) * page_size; key++) {
        if (key >= size) break;
        let index = ("0000" + (key)).substr(-c);
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
    else if (current < page * page_size) {
        let s = playlist.get(current);
        msg = `⬐\n\`${("0000" + (current)).substr(-c)}\` - ${s.title}\n⬑\n...\n` + msg;
    } else if (current > (page + 1) * page_size) {
        let s = playlist.get(current);
        msg += `...\n⬐\n\`${("0000" + (current)).substr(-c)}\` - ${s.title}\n⬑\n`;
    }
    
    
    // Pagination
    const pagination = new Discord.MessageActionRow();
    let btn_page_back = new Discord.MessageButton({customId: 'page_back', label: 'back', style: 'SECONDARY'});
    btn_page_back.setDisabled(page === 0 || pages === 1);
    let btn_page_next = new Discord.MessageButton({customId: 'page_next', label: 'forward', style: 'SECONDARY'});
    btn_page_next.setDisabled(page === pages - 1 || pages === 1);
    
    pagination.addComponents([btn_page_back, btn_page_next]);
    
    //Controls
    const controls = new Discord.MessageActionRow();
    let btn_shuffle = new Discord.MessageButton({customId: 'shuffle', label: 'shuffle', style: 'SECONDARY'});
    let btn_prev = new Discord.MessageButton({customId: 'prev', label: 'Previous Song', style: 'SECONDARY', disabled: !squeue.playlist.get_prev()});
    let btn_next = new Discord.MessageButton({customId: 'next', label: 'Next Song', style: 'SECONDARY', disabled: !squeue.playlist.get_next()});
    
    let btn_play_pause = new Discord.MessageButton({customId: 'play_pause', style: 'SECONDARY'});
    btn_play_pause.setDisabled(squeue.playlist.size() === 0);
    btn_play_pause.setLabel(squeue.playing ? 'Pause' : 'Play');
    
    controls.addComponents([btn_shuffle, btn_prev, btn_play_pause, btn_next]);
    
    // Playlists
    let playlist_row = (await playlist_show(message, false)).components[0];
    
    const embed = new Discord.MessageEmbed();
    embed.setColor('#8c223e');
    embed.setTitle('QJukebox - Playlist: ' + playlist.name);
    // embed.setAuthor('Quintao');
    embed.setFooter(squeue.configs.loop ? `Loop: Enabled` : `Loop: Disabled`);
    embed.setDescription(msg);
    
    let data = {embeds: [embed], components: [pagination, controls, playlist_row]};
    
    if (send) {
        let last_message = await squeue.text_channel.send(data);
        squeue.qmessages_add(last_message);
        return;
    }
    
    return data;
}

client.on('interactionCreate', async interaction => {
    let squeue = queue.get(interaction.guild.id);
    if (interaction.isButton()) {
        if (interaction.customId === 'update') {
            // interaction.update(await show_queue(interaction.message, false));
        } else if (interaction.customId === 'page_back') {
            squeue.playlist.current_page--;
        } else if (interaction.customId === 'page_next') {
            squeue.playlist.current_page++;
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
        } else if (interaction.customId === 'next') {
            await next(interaction, false);
        }
        interaction.update({});
        // interaction.update(await show_queue(interaction.message, false));
    } else if (interaction.isSelectMenu()) {
        if (interaction.customId === 'playlist_select') {
            let index = parseInt(interaction.values[0]);
            console.log(interaction.values[0]);
            await playlist(interaction.message, index);
            // await interaction.update(await playlist_show(interaction.message, false));
            interaction.update({});
        }
    }
    squeue.qmessages_update(await show_queue(interaction.message, false));
    
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