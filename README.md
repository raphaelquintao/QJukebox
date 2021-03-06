# QJukebox

Just another Discord music bot, but done the right way!

![print](https://user-images.githubusercontent.com/2568375/131212271-a408d48d-9b54-4947-922a-5df22888be42.png)


### Features
* [x] Play from Youtube
* [x] Play from Youtube Music
* [x] Play from Spotify
* [x] Create and save playlists
* [x] Queue Pagination (It is necessary to deal with the limit of 400 characters per message)
* [ ] Song Lyrics
* [ ] Blacklist for blocking songs
* [ ] Volume normalization


### Requirements
1. `ffmpeg`, `libtool` and `libsodium-dev`
   - Debian: `sudo apt-get install ffmpeg libtool libsodium-dev`
2. `nodejs ^16.7.0`
3. Discord Token an client id
4. Discord OAuth2 with scope `bot` and `applications.commands` with `Administrator` permissions
5. YouTube API key
6. Spotify API client id and client secret

### Config
Create a `config.json` or just rename the `example.config.json` and put your settings.

```json
{
  "text_channel" : "\uD83C\uDF99・Jukebox",
  "voice_channel" : "\uD83D\uDCFB・Jukebox",
  "discord_client_id": "",
  "discord_token": "",
  "youtube_api_key": "",
  "spotify_client_id" : "",
  "spotify_client_secret" : ""
}
```

### Running 

```
npm install
npm run start
```

### Commands 
|Slash Command   |Description|
|----------------|---|
|about           |Show about message|
|leave           |Make the bot leave the channel, also stops the player|
|play            |Add a song to the current queue and start playing|
|stop            |Stops the player|
|pause           |Pauses the player|
|unpause         |Unpauses the player|
|skip            |Skip to the next song|
|shuffle         |Shuffle the queue|
|clear           |Clears the queue|
|loop            |Queue loop (enable or disable)|
|notify          |Notifies you when it starts playing a new song (enable or disable)|
|queue           |Display the current queue and controls|
|remove          |Remove the specified song from current queue|
|jump            |Jump to specified song in the current queue|
|playlist save   |Saves the current queue as playlist|
|playlist create |Create a new playlist|
|playlist delete |Delete a playlist|
|debug           |Show debug messages (enable or disable)|
