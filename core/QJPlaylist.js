const fs = require("fs");
const QJSong = require("./QJSong.js");
const {load_song} = require("./QJSong.js");
const {joinVoiceChannel, createAudioResource} = require("@discordjs/voice");

const playlists_path = __dirname + "/../_data/playlists";

function load_playlist(id = '877017433884479569', filename = 'Default') {
    let path = `${playlists_path}/${id}`;
    let file_path = `${path}/${filename}.json`;
    
    if (fs.existsSync(file_path)) {
        let data = fs.readFileSync(file_path);
        let json = JSON.parse(data);
        let playlist = new QJPlaylist(id);
        playlist.name = filename;
        for (const song_data of json) {
            playlist.add(load_song(song_data));
        }
        return playlist;
    }
    return false;
}

function list_playlist(id = '877017433884479569', filename = 'Default') {
    let path = `${playlists_path}/${id}`;
    
    let names = [];
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(file => {
            let file_path = `${path}/${file}`;
            // let stat = fs.statSync(file_path);
            // console.log(stat);
            names.push(file.replace(/\.json/, ''));
        });
        names.sort((a, b) => {
            return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
        });
    }
    return names;
}

class QJPlaylist {
    id;
    filename = '';
    /** @type {QJSong} */
    _current = null;
    current_index = 0;
    /** @type {QJSong[]} */
    songs = [];
    
    constructor(id = '877017433884479569', name = 'Default') {
        this.id = id;
        this.filename = name;
    }
    
    size() {
        return this.songs.length;
    }
    
    get name() {
        return this.filename;
    }
    
    set name(name) {
        this.filename = name;
    }
    
    save(filename = 'Default') {
        if (!filename) filename = this.filename;
        this.filename = filename;
        
        let json = JSON.stringify(this.songs);
        
        let path = `${playlists_path}/${this.id}`;
        
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        
        let file_path = `${path}/${filename}.json`;
        fs.writeFileSync(file_path, json, function (err) {
            if (err) return console.log(err);
            console.log(`Saved: ${file_path}`);
        });
    }
    
    /**
     * Add song to playlist
     * @param {QJSong| QJSong []} song
     */
    add(song) {
        if (Array.isArray(song)) {
            this.songs.push(...song);
        } else {
            this.songs.push(song);
        }
        this._current = this.get_current();
    }
    
    /**
     * Remove song from playlist and return the removed element
     * @param index
     * @return {QJSong}
     */
    remove(index) {
        if (index > this.songs.length - 1) return;
        return this.songs.splice(index, 1)[0];
    }
    
    clear() {
        this.songs = [];
        this._current = null;
        this.current_index = 0;
    }
    
    /**
     * Get song from playlist
     * @param index
     * @return {boolean|QJSong}
     */
    get(index) {
        if (this.songs.length > index) return this.songs[index];
        return false;
    }
    
    /**
     * Get current song
     * @return {boolean|QJSong}
     */
    get_current() {
        return this.get(this.current_index);
    }
    
    /**
     * Get previous playlist song
     * @return {QJSong|boolean}
     */
    get_prev() {
        return this.get(this.current_index - 1);
    }
    
    /**
     * Get next playlist song
     * @return {QJSong|boolean}
     */
    get_next() {
        return this.get(this.current_index + 1);
    }
    
    /**
     * Set current number based on song playing
     * @param {QJSong} song
     */
    set_playing(song) {
        if (song === null) {
            this._current = null;
            this.current_index = 0;
        } else {
            let found = this.songs.findIndex((obj, index) => obj === song);
            if (found >= 0) {
                this._current = song;
                this.current_index = found;
            }
        }
    }
    
    /**
     * Shuffle the songs in the playlist
     */
    shuffle() {
        if (this.songs.length === 0) return;
        for (let i = this.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * this.songs.length);
            let temp = this.songs[i];
            this.songs[i] = this.songs[j];
            this.songs[j] = temp;
        }
        this.set_playing(this._current);
    }
    
}



module.exports.QJPlaylist = QJPlaylist;
module.exports.load_playlist = load_playlist;
module.exports.list_playlist = list_playlist;