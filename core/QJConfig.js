import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';


const __dirname = dirname(fileURLToPath(import.meta.url));
const data_path = __dirname + "/../_data";


export default class QJConfig {
    id;
    name;
    playlist_selected = -1;
    _debug = true;
    _notify = true;
    _loop = false;
    
    constructor(id, name) {
        this.id = id;
        this.load();
        this.name = name;
        this.save();
    }
    
    // -- Gets --

    get debug() {
        this.load();
        return this._debug;
    }
    
    get notify() {
        this.load();
        return this._notify;
    }
    
    get loop() {
        this.load();
        return this._loop;
    }
    
    // -- Sets --
    
    set debug(debug) {
        this._debug = debug;
        this.save();
    }
    
    set notify(notify) {
        this._notify = notify;
        this.save();
    }
    
    set loop(loop) {
        this._loop = loop;
        this.save();
    }
    
    save() {
        let path = `${data_path}/${this.id}`;
        let json = JSON.stringify(this, null, 2);
        
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        
        let file_path = `${path}/config.json`;
        fs.writeFileSync(file_path, json, function (err) {
            if (err) return console.log(err);
            console.log(`Config Saved: ${file_path}`);
        });
    }
    
    load() {
        let path = `${data_path}/${this.id}`;
        let file_path = `${path}/config.json`;
        
        if (!fs.existsSync(path)) fs.mkdirSync(path);
        
        if (fs.existsSync(file_path)) {
            let data = fs.readFileSync(file_path, 'utf8');
            let json = JSON.parse(data.toString());
            
            // this._default_playlist = json._default_playlist;
            this._notify = json._notify;
            this._loop = json._loop;
        }
        return this;
    }
    
}


// module.exports = QJConfig;