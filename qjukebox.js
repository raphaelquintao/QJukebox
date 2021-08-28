import Discord from "discord.js";
import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import qyoutube from "./core/qyoutube.js";
import qspotify from "./core/qspotify.js";
import QJQueue from "./core/QJQueue.js";
import QJPlaylist, { delete_playlist, list_playlist, load_playlist } from "./core/QJPlaylist.js";
import { qprint } from "./core/QUtils.js";

import { createRequire } from "module";

const require = createRequire(import.meta.url);

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

let cmds = [
    new SlashCommandBuilder().setName('about').setDescription('Show about message'),
    new SlashCommandBuilder().setName('play').setDescription('Add a song to the current queue and start playing')
        .addStringOption(option => option.setName('url').setDescription('A link for a song').setRequired(true)),
    new SlashCommandBuilder().setName('stop').setDescription('Stops the player'),
    new SlashCommandBuilder().setName('pause').setDescription('Pauses the player'),
    new SlashCommandBuilder().setName('unpause').setDescription('Unpauses the player'),
    new SlashCommandBuilder().setName('skip').setDescription('Skip to the next song'),
    new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue'),
    new SlashCommandBuilder().setName('clear').setDescription('Clears the queue'),
    new SlashCommandBuilder().setName('loop').setDescription('Queue loop')
        .addStringOption(option => option.setName('mode').setDescription('The new looping mode').setRequired(true)
            .addChoice('Enabled', 'enabled').addChoice('Disabled', 'disabled')),
    new SlashCommandBuilder().setName('notify').setDescription('Toggles whether QJukebox will announce when a new song start playing')
        .addStringOption(option => option.setName('mode').setDescription('The new notify mode').setRequired(true)
            .addChoice('Enabled', 'enabled').addChoice('Disabled', 'disabled')),
    new SlashCommandBuilder().setName('queue').setDescription('Display the current queue and controls'),
    new SlashCommandBuilder().setName('remove').setDescription('Remove the specified song from current queue')
        .addIntegerOption(option => option.setName('index').setDescription('The position of the song you want to remove').setRequired(true)),
    new SlashCommandBuilder().setName('jump').setDescription('Jump to specified song in the current queue')
        .addIntegerOption(option => option.setName('index').setDescription('The position of the song you want to jump to').setRequired(true)),
    new SlashCommandBuilder().setName('playlist').setDescription('Handdle playlists')
        .addSubcommand(
            new SlashCommandSubcommandBuilder().setName('save').setDescription('Saves the current queue as playlist')
                .addStringOption(o => o.setName('new_name').setDescription('The new name to save the playlist').setRequired(false))
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder().setName('create').setDescription('Create a new playlist')
                .addStringOption(o => o.setName('name').setDescription('The name of the new playlist').setRequired(true))
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder().setName('delete').setDescription('Delete a playlist')
                .addStringOption(o => o.setName('name').setDescription('The of the saved playlist to delete').setRequired(true))
        )

];


async function register_commands(guild) {
    let guild_id = guild.id;
    const rest = new REST({version: '9'}).setToken(discord_token);
    try {
        qprint(' * Refreshing slash commands... ', '', false, '');
        await rest.put(Routes.applicationGuildCommands(discord_client_id, guild_id), {body: cmds},);
        qprint(`Success`, 'green', false, '\n');
        
    } catch (error) {
        qprint(`Fail`, 'red', false, '\n');
        // console.error(error);
    }
}

async function create_server_queue(guild) {
    let squeue = queue.get(guild.id);
    
    let _text_channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === text_channel.toLowerCase() && channel.type === "GUILD_TEXT");
    let _voice_channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === voice_channel.toLowerCase() && channel.type === "GUILD_VOICE");
    
    if (_text_channel)
        await _text_channel.messages.fetch().then(async messages => {
            messages.forEach(message => {
                // message.delete();
            });
            
        });
    
    if (!squeue) {
        qprint(' * Creating server queue... ', '', false, '');
        squeue = new QJQueue(guild, _text_channel, _voice_channel);
        await squeue.bind_events();
        queue.set(guild.id, squeue);
        qprint(`Success`, 'green', false, '\n');
    }
}

async function update_server_queue(guild) {
    let squeue = queue.get(guild.id);
    
    if (!squeue) create_server_queue(guild);
    
    if (squeue.text_channel && squeue.voice_channel && squeue.on_next_song) return;
    
    // Create Default Channels
    qprint(' * Creating Default Channels... ', '', false, '');
    let _text_channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === text_channel.toLowerCase() && channel.type === "GUILD_TEXT");
    let _voice_channel = guild.channels.cache.find(channel => channel.name.toLowerCase() === voice_channel.toLowerCase() && channel.type === "GUILD_VOICE");
    
    if (!_text_channel) _text_channel = await guild.channels.create(text_channel, {type: "GUILD_TEXT"});
    if (!_voice_channel) _voice_channel = await guild.channels.create(voice_channel, {type: "GUILD_VOICE"});
    qprint(`Success`, 'green', false, '\n');
    
    
    qprint(' * Updating server queue... ', '', false, '');
    // Updating Server Queue
    if (!squeue.text_channel) squeue.text_channel = _text_channel;
    if (!squeue.voice_channel) squeue.voice_channel = _voice_channel;
    if (!squeue.on_next_song) {
        squeue.on_next_song = async (a) => {
            await squeue.qmessages_update(await show_queue(guild, false));
        }
    }
    qprint(`Success`, 'green', false, '\n');
}

client.once("ready", async (ev) => {
    qprint('-> Ready!', 'lgreen', true);
    // console.log(generateDependencyReport());
    
    for (const g of client.guilds.cache) {
        let guild = g[1];
        
        qprint(`${guild.id}`, 'yellow', false, '');
        qprint(` - `, '', false, '');
        qprint(`${guild.name}`, 'blue', true, '\n');
        
        await register_commands(guild);
        await create_server_queue(guild);
    }
});

client.once("guildCreate", async (guild) => {
    qprint(`${guild.id}`, 'yellow', false, '');
    qprint(` - `, '', false, '');
    qprint(`${guild.name}`, 'blue', true, '\n');
    
    await register_commands(guild);
    await create_server_queue(guild);
});

client.once("reconnecting", () => {
    console.log("Reconnecting!");
});

client.once("disconnect", () => {
    console.log("Disconnect!");
});


async function play_handler(iteraction, param = '', reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    
    // Parse song url and retrieve data.
    function get_songs(url, user = '') {
        let match = url.trim().match(/^(?:https?:\/\/)(?<y>(?:www\.youtube\.com)|(?:youtu\.be)|(?<ymusic>music\.youtube\.com))?(?<s>open\.spotify\.com)?/);
        if (!match) return false;
        let {y, ymusic, s} = match.groups;
        
        if (y !== undefined) {
            return qyoutube.getInfo(url, user, ymusic);
        } else if (s !== undefined) {
            return qspotify.getInfo(url, user);
        }
        
        return false;
    }
    
    if (param !== '') {
        let songs = await get_songs(param, iteraction.user.username);
        if (!songs) return iteraction.reply({content: `Invalid URL: ${param}`});
        squeue.playlist.add(songs);
        iteraction.reply({content: `${songs.length} new songs has been added to the queue!`});
        
        squeue.stoped = false;
        
        if (!squeue.playing) {
            let song = squeue.playlist.get(0);
            if (song) await song.play(squeue, iteraction);
        }
        
    } else {
        await unpause(iteraction, reply);
    }
}

async function stop(iteraction, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    if (!squeue) return squeue.text_channel.send("There is no song that I could stop!");
    
    squeue.stoped = true;
    squeue.player.stop();
    
    
    if (reply) await iteraction.reply({content: "Player stoped"});
}

async function pause(iteraction, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    if (!squeue) return squeue.text_channel.send("There is no song that I could stop!");
    
    squeue.player.pause();
    // squeue.qmessages_update(await show_queue(iteraction.guild, false));
    
    if (reply) await iteraction.reply({content: "Player paused"});
}

async function unpause(iteraction, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    
    if (!squeue) return await iteraction.reply("There is no song that I could stop!");
    
    if (!squeue.playing) {
        if (squeue.player.state.status === 'paused') {
            squeue.player.unpause();
            return;
        }
        squeue.stoped = false;
        let song = squeue.playlist.get_current();
        if (song) await song.play(squeue, iteraction);
        else {
            if (reply) await iteraction.reply({content: "There's no songs on queue to play!"});
        }
        // squeue.qmessages_update(await show_queue(iteraction.guild, false));
    }
    
    if (reply) await iteraction.reply({content: "Unpaused"});
}

async function skip(iteraction, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    
    if (!squeue.playlist.get_next()) return iteraction.reply({content: "There is no song that I could skip!"});
    
    let next_song = squeue.playlist.get_next();
    if (next_song) {
        await next_song.play(squeue, iteraction);
        // squeue.qmessages_update(await show_queue(iteraction.guild, false));
    }
    
    if (reply) await iteraction.reply({content: `Skipped to song: ${next_song.title} `});
}

async function prev(message, reply = true) {
    let squeue = queue.get(message.guild.id);
    let song = squeue.playlist.get_prev();
    if (!song) return false;
    if (song) {
        await song.play(squeue, message, reply);
        // squeue.qmessages_update(await show_queue(message.guild, false));
    }
}

async function next(message, reply = true) {
    let squeue = queue.get(message.guild.id);
    let song = squeue.playlist.get_next();
    if (!song) return false;
    if (song) {
        await song.play(squeue, message, reply);
        // squeue.qmessages_update(await show_queue(message.guild, false));
    }
}

async function shuffle(iteraction, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    squeue.playlist.shuffle();
    // squeue.qmessages_update(await show_queue(iteraction.guild, false));
    
    if (reply) await iteraction.reply({content: `Playlist has been shuffled!`});
}

async function clear(iteraction, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    
    squeue.playlist.clear();
    squeue.player.stop();
    
    // squeue.qmessages_update(await show_queue(iteraction.guild, false));
    
    if (reply) await iteraction.reply({content: `The playlist has been cleared!`});
}

async function loop(iteraction, mode, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    
    squeue.configs.loop = mode === 'enabled';
    
    if (reply) await iteraction.reply({content: `Loop has ben ${mode}`});
}

async function notify(iteraction, mode, reply = true) {
    let squeue = queue.get(iteraction.guild.id);
    
    squeue.configs.notify = mode === 'enabled';
    
    if (reply) await iteraction.reply({content: `Notification has ben ${mode}`});
}

async function remove(iteraction, index) {
    let squeue = queue.get(iteraction.guild.id);
    let _index = parseInt(index);
    
    if (squeue.playing && squeue.playlist.current_index === _index) return iteraction.reply({content: `You cant remove the current playing song!`});
    
    if (squeue.playlist.size() === 0) return await iteraction.reply({content: `There's no song to remove!`});
    
    let curr = squeue.playlist.get_current();
    let prev = squeue.playlist.get_prev();
    let next = squeue.playlist.get_next();
    
    
    let removed = squeue.playlist.remove(_index);
    
    if (curr === removed) {
        squeue.playlist.set_playing(next ? next : prev ? prev : null);
    } else if (squeue.playlist.current_index > _index) {
        let previous = squeue.playlist.get(squeue.playlist.current_index - 1);
        squeue.playlist.set_playing(curr);
    }
    
    // squeue.qmessages_update(await show_queue(iteraction.guild, false));
    
    await iteraction.reply({content: `The song "${removed.title}" has been remove!`});
}

async function jump(iteraction, index) {
    let squeue = queue.get(iteraction.guild.id);
    if (index < 0) return iteraction.reply({content: `A song ID is required!`});
    let song = squeue.playlist.get(index);
    if (squeue.playlist.size() === 0) return await iteraction.reply({content: "There is no song that I could jump!"});
    if (!song) return await iteraction.reply({content: `Invalid song ID: ${index}`});
    if (song) {
        await song.play(squeue, iteraction, false);
        // squeue.qmessages_update(await show_queue(iteraction.guild, false));
    }
    
    iteraction.reply({content: `Jumped to song: ${song.title} `});
}

async function playlist_load(interaction, index) {
    let squeue = queue.get(interaction.guild.id);
    let playlists_names = list_playlist(interaction.guild.id);
    if (playlists_names.length === 0) return await interaction.reply('No playlists to load');
    
    let _index = parseInt(index);
    if (isNaN(_index)) return;
    if (_index > playlists_names.length) return await interaction.reply('Invalid Playlist ID');
    let playlist_name = playlists_names[_index];
    let playlist = load_playlist(interaction.guild.id, playlist_name);
    
    squeue.playlist = playlist;
    
    if (!playlist) return await interaction.reply('No playlists to load');
    
    if (squeue.playlist.size() > 0) {
        let song = squeue.playlist.get(0);
        await song.play(squeue, interaction);
    }
    
}

async function playlist_save(interaction, name) {
    let squeue = queue.get(interaction.guild.id);
    
    let playlist = squeue.playlist;
    playlist.save(name);
    
    interaction.reply({content: `Playlist "${playlist.name}" saved!`});
}

async function playlist_create(interaction, name, reply = true, save = true) {
    let squeue = queue.get(interaction.guild.id);
    
    let playlist = new QJPlaylist(interaction.guild.id, name);
    if (save) playlist.save();
    
    squeue.playlist = playlist;
    
    if (squeue.playlist.size() > 0) {
        let song = squeue.playlist.get(0);
        await song.play(squeue, interaction);
    }
    squeue.player.stop();
    
    if (reply) await interaction.reply({content: `Playlist "${playlist.name}" created!`});
}

async function playlist_delete(interaction, name) {
    let squeue = queue.get(interaction.guild.id);
    let playlist_names = list_playlist('877017433884479569');
    let exits = playlist_names.find(value => value === name);
    
    if (!exits) return await interaction.reply({content: `Playlist "${name}" don't exist !`});
    
    let deleted = delete_playlist(interaction.guild.id, name);
    
    if (!deleted) return await interaction.reply({content: `Failed to delete playlist "${name}" !`});
    
    if (squeue.playlist.name === name) await playlist_create(interaction, 'Default', false, false);
    
    await interaction.reply({content: `Playlist "${name}" deleted!`});
}


async function show_playlist(guild, send = true) {
    let squeue = queue.get(guild.id);
    let playlists_names = list_playlist(guild.id);
    
    let msg = '';
    let options = [];
    let playlists = [];
    for (const key in playlists_names) {
        let playlist_name = playlists_names[key];
        let index = ("0000" + (parseInt(key))).substr(-3);
        let playlist = load_playlist(guild.id, playlist_name);
        playlists.push(playlist);
        
        options.push({label: playlist_name, description: `${playlist.size()} Songs\n`, value: index});
        msg += `\`${index}\` - ${playlist_name} - ${playlist.size()} Songs\n`;
        
    }
    const embed = new Discord.MessageEmbed();
    embed.title = 'QJukebox - Playlists';
    // embed.setDescription(msg);
    const row = new Discord.MessageActionRow();
    let playlist_select = new Discord.MessageSelectMenu({customId: 'playlist_select', placeholder: 'Select a playlist to load'});
    
    
    playlist_select.setPlaceholder(squeue.playlist.name);
    
    if (options.length === 0) {
        options.push({label: "No playlists", description: '', value: '0'});
        playlist_select.setPlaceholder('No playlist');
        playlist_select.setDisabled(true);
    }
    
    playlist_select.addOptions(options);
    
    
    
    row.addComponents(playlist_select);
    
    
    let data = {content: '**Playlists:**', components: [row]};
    
    if (send) {
        let last_message = await squeue.text_channel.send(data);
        squeue.pmessages_add(last_message);
        return;
    }
    
    return data;
}

async function show_queue(guild, send = true) {
    let squeue = queue.get(guild.id);
    if (!squeue) return text_channel.send({content: "There is no queue!"});
    
    
    let playlist = squeue.playlist;
    let current = playlist.current_index;
    
    
    let size = playlist.size();
    let page = playlist.current_page;
    let page_size = playlist.page_size;
    
    let pages = playlist.pages;
    
    let c = `${size}`.length;
    
    let msg = '';
    
    if (size > 0) {
        for (let key = page * page_size; key < (page + 1) * page_size; key++) {
            if (key >= size || key < 0) break;
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
        } else if (current >= (page + 1) * page_size) {
            let s = playlist.get(current);
            msg += `...\n⬐\n\`${("0000" + (current)).substr(-c)}\` - ${s.title}\n⬑\n`;
        }
    }
    
    // Pagination
    const pagination = new Discord.MessageActionRow();
    let btn_page_back = new Discord.MessageButton({customId: 'page_back', label: 'back', style: 'SECONDARY'});
    btn_page_back.setDisabled(page === 0 || pages === 0 || pages === 1);
    let btn_page_next = new Discord.MessageButton({customId: 'page_next', label: 'forward', style: 'SECONDARY'});
    btn_page_next.setDisabled(page === pages - 1 || pages === 0 || pages === 1);
    
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
    let playlist_row = (await show_playlist(guild, false)).components[0];
    
    // let saved = squeue.playlist.saved ? ' - (saved)' : ' - (unsaved)';
    let saved = '';
    
    
    
    const embed = new Discord.MessageEmbed();
    embed.setColor('#8c223e');
    embed.setAuthor('QJukebox');
    embed.setTitle(`Playlist: ${playlist.name} - *${playlist.size()} songs*${saved}`);
    let footer = squeue.configs.loop ? `Loop: Enabled` : `Loop: Disabled`;
    footer += '\n'
    footer += squeue.configs.notify ? `Notify: Enabled` : `Notify: Disabled`
    embed.setFooter(footer);
    embed.setDescription(msg);
    
    let data = {embeds: [embed], components: [pagination, controls, playlist_row]};
    
    if (send) {
        let last_message = await squeue.text_channel.send(data);
        squeue.qmessages_add(last_message);
        return true;
    }
    
    return data;
}

client.on('interactionCreate', async interaction => {
    let squeue = queue.get(interaction.guild.id);
    await update_server_queue(interaction.guild);
    
    if (interaction.message) {
        let message = squeue.qmessage_find_by_id(interaction.message.id);
        if (!message) {
            await interaction.reply({content: `<@${interaction.user.id}> old controls can't be used!`});
            interaction.message.delete();
            return;
        }
    }
    
    // console.log(interaction);
    
    if (interaction.channelId !== squeue.text_channel.id) {
        interaction.reply({content: `You can only send commans to me on channel ${squeue.text_channel.name}`});
        return;
    }
    
    if (interaction.isCommand()) {
        const cmd = interaction.commandName;
        
        if (cmd === 'about') {
            about(interaction)
            
        } else if (cmd === 'play') {
            let url = interaction.options.getString('url');
            await play_handler(interaction, url);
            
        } else if (cmd === 'stop') {
            await stop(interaction);
            
        } else if (cmd === 'pause') {
            await pause(interaction);
            
        } else if (cmd === 'unpause') {
            await unpause(interaction);
            
        } else if (cmd === 'skip') {
            await skip(interaction);
            
        } else if (cmd === 'shuffle') {
            await shuffle(interaction);
            
        } else if (cmd === 'clear') {
            await clear(interaction);
            
        } else if (cmd === 'loop') {
            let mode = interaction.options.getString('mode');
            await loop(interaction, mode);
            
        } else if (cmd === 'notify') {
            let mode = interaction.options.getString('mode');
            await notify(interaction, mode);
            
        } else if (cmd === 'remove') {
            let index = interaction.options.getInteger('index');
            await remove(interaction, index);
            
        } else if (cmd === 'jump') {
            let index = interaction.options.getInteger('index');
            await jump(interaction, index);
            
        } else if (cmd === 'queue') {
            await interaction.reply(`Loading queue...`);
            await show_queue(interaction.guild, true);
            await interaction.deleteReply();
            
            
        } else if (cmd === 'playlist') {
            let sub_cmd = interaction.options.getSubcommand();
            
            if (sub_cmd === 'save') {
                let new_name = interaction.options.getString('new_name');
                
                await playlist_save(interaction, new_name);
                
            } else if (sub_cmd === 'create') {
                let name = interaction.options.getString('name');
                
                await playlist_create(interaction, name, true, false);
                
            } else if (sub_cmd === 'delete') {
                let name = interaction.options.getString('name');
                
                await playlist_delete(interaction, name);
                
                
            }
        } else {
            await interaction.reply(cmd);
        }
        
        
        
    } else if (interaction.isButton()) {
        if (interaction.customId === 'update') {
            // interaction.update(await show_queue(interaction.message, false));
        } else if (interaction.customId === 'page_back') {
            squeue.playlist.current_page--;
        } else if (interaction.customId === 'page_next') {
            squeue.playlist.current_page++;
        } else if (interaction.customId === 'play_pause') {
            if (squeue.playing) {
                await pause(interaction, false);
            } else {
                await play_handler(interaction, '', false);
            }
        } else if (interaction.customId === 'shuffle') {
            await shuffle(interaction, false);
        } else if (interaction.customId === 'prev') {
            await prev(interaction, false);
        } else if (interaction.customId === 'next') {
            await next(interaction, false);
        }
        await interaction.update({});
        // interaction.update(await show_queue(interaction.message, false));
    } else if (interaction.isSelectMenu()) {
        if (interaction.customId === 'playlist_select') {
            let index = parseInt(interaction.values[0]);
            await playlist_load(interaction, index);
            // console.log(interaction);
            if (!interaction.deferred && !interaction.replied) interaction.update({});
            
        }
    }
    // if (interaction.message)
    await squeue.qmessages_update(await show_queue(interaction.guild, false));
    
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
    // embed.setAuthor(`Copyright 2021, Raphael Quintão`, '', 'https://github.com/raphaelquintao');
    // embed.setFooter(`QJukebox - ${VERSION}`);
    embed.setTitle(`QJukebox - ${VERSION}`);
    embed.setDescription(msg);
    return message.reply({embeds: [embed]});
}




// Main Loop
client.login(discord_token).catch(reason => {
    console.log('Error: ', reason)
});