const fs = require("fs");


const data_path = __dirname + "/../_data";


class QJConfig {
    id;
    // _default_playlist = 0;
    playlist_selected = -1;
    _notify = true;
    _loop = false;
    
    constructor(id) {
        this.id = id;
        this.load();
    }
    
    // -- Gets --
    // get default_playlist() {
    //     this.load();
    //     return this._default_playlist;
    // }
    
    get notify() {
        this.load();
        return this._notify;
    }
    
    get loop() {
        this.load();
        return this._loop;
    }
    
    // -- Sets --
    // set default_playlist(default_playlist) {
    //     this._default_playlist = default_playlist;
    //     this.save();
    // }
    
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


module.exports = QJConfig;