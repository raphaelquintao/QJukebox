# QJukebox

Just another Discord music bot, but done the right way!



### Features
* [x] Create and save playlists
* [x] Play from Youtube
* [x] Play from Spotify
* [ ] Pagination of the queue (It is necessary to deal with the limit of 400 characters per message)
* [ ] Song Lyrics
* [ ] Blacklist for blocking songs
* [ ] Volume normalization


### Requirements
1. `libtool`
2. `libsodium-dev`
3. `ffmpeg`
4. `nodejs ^16.7.0`
5. Discord Token
6. YouTube API key
7. Spotify API client id and client secret

### Config
Rename `example.config.json` to `config.json` and put you credentials.

```json
{
  "prefix": "!",
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
|Command|Parameter|Description|
|---|---|---|
|play | \<url> |Plays a song|
