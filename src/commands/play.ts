import {TextChannel, Message} from 'discord.js';
import {URL} from 'url';
import {TYPES} from '../types';
import {inject, injectable} from 'inversify';
import {QueuedSong, STATUS} from '../services/player';
import PlayerManager from '../managers/player';
import {getMostPopularVoiceChannel} from '../utils/channels';
import LoadingMessage from '../utils/loading-message';
import errorMsg from '../utils/error-msg';
import embed from '../utils/embed';
import Command from '.';
import GetSongs from '../services/get-songs';

@injectable()
export default class implements Command {
  public name = 'play';
  public aliases = ['p'];
  public examples = [
    ['play', 'resume paused playback'],
    ['play https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'plays a YouTube video'],
    ['play cool music', 'plays the first search result for "cool music" from YouTube'],
    ['play https://www.youtube.com/watch?list=PLi9drqWffJ9FWBo7ZVOiaVy0UQQEm4IbP', 'adds the playlist to the queue'],
    ['play https://open.spotify.com/track/3ebXMykcMXOcLeJ9xZ17XH?si=tioqSuyMRBWxhThhAW51Ig', 'plays a song from Spotify'],
    ['play https://open.spotify.com/album/5dv1oLETxdsYOkS2Sic00z?si=bDa7PaloRx6bMIfKdnvYQw', 'adds all songs from album to the queue'],
    ['play https://open.spotify.com/playlist/37i9dQZF1DX94qaYRnkufr?si=r2fOVL_QQjGxFM5MWb84Xw', 'adds all songs from playlist to the queue'],
    ['play cool music immediate', 'adds the first search result for "cool music" to the front of the queue'],
    ['play cool music i', 'adds the first search result for "cool music" to the front of the queue']
  ];

  public requiresVC = true;

  private readonly playerManager: PlayerManager;
  private readonly getSongs: GetSongs;

  constructor(@inject(TYPES.Managers.Player) playerManager: PlayerManager, @inject(TYPES.Services.GetSongs) getSongs: GetSongs) {
    this.playerManager = playerManager;
    this.getSongs = getSongs;
  }

  public async execute(msg: Message, args: string []): Promise<void> {
    const [targetVoiceChannel] = msg.author.voiceChannel;

    const player = this.playerManager.get(msg.guild!.id);

    const queueOldSize = player.queueSize();
    const wasPlayingSong = player.getCurrent() !== null;

    if (args.length === 0) {
      if (player.status === STATUS.PLAYING) {
        return;
      }

      // Must be resuming play
      if (!wasPlayingSong) {
        await msg.channel.send(errorMsg('Nothing to play'));
        return;
      }

      if (player.voiceConnection === null) {
        await player.connect(targetVoiceChannel);
      }
      await player.play();

      await msg.react('▶')
      return;
    }

    const addToFrontOfQueue = args[args.length - 1] === 'i' || args[args.length - 1] === 'immediate';

    const newSongs: QueuedSong[] = [];
    let extraMsg = '';

    // Test if it's a complete URL
    try {
      const url = new URL(args[0]);

      const YOUTUBE_HOSTS = ['www.youtube.com', 'youtu.be', 'youtube.com'];
      const SOUNDCLOUD_HOSTS = ['www.soundcloud.com', 'soundcloud.com'];

      if (YOUTUBE_HOSTS.includes(url.host)) {
        // YouTube source
        if (url.searchParams.get('list')) {
          // YouTube playlist
          newSongs.push(...await this.getSongs.youtubePlaylist(url.searchParams.get('list') as string));
        } else {
          // Single video
          const song = await this.getSongs.youtubeVideo(url.href);

          if (song) {
            newSongs.push(song);
          } else {
            await msg.channel.send(errorMsg('that doesn\'t exist'));
            return;
          }
        }
      } else if (SOUNDCLOUD_HOSTS.includes(url.host)) {
        const song = await this.getSongs.soundcloudSong(url.href);
        if (song) {
          newSongs.push(song);
        } else {
          await msg.channel.send(errorMsg('that doesn\'t exist'));
          return;
        }
      } else if (url.protocol === 'spotify:' || url.host === 'open.spotify.com') {
        const [convertedSongs, nSongsNotFound, totalSongs] = await this.getSongs.spotifySource(args[0]);

        if (totalSongs > 50) {
          extraMsg = 'a random sample of 50 songs was taken';
        }

        if (totalSongs > 50 && nSongsNotFound !== 0) {
          extraMsg += ' and ';
        }

        if (nSongsNotFound !== 0) {
          if (nSongsNotFound === 1) {
            extraMsg += '1 song was not found';
          } else {
            extraMsg += `${nSongsNotFound.toString()} songs were not found`;
          }
        }

        newSongs.push(...convertedSongs);
      }
    } catch (_: unknown) {
      // Not a URL, must search YouTube
      const query = addToFrontOfQueue ? args.slice(0, args.length - 1).join(' ') : args.join(' ');

      const song = await this.getSongs.youtubeVideoSearch(query);

      if (song) {
        newSongs.push(song);
      } else {
        await msg.channel.send(errorMsg('that doesn\'t exist'));
        return;
      }
    }

    if (newSongs.length === 0) {
      await msg.channel.send(errorMsg('no songs found'));
      return;
    }

    newSongs.forEach(song => player.add(song, {immediate: addToFrontOfQueue}));

    const firstSong = newSongs[0];

    if (extraMsg !== '') {
      extraMsg = ` (${extraMsg})`;
    }

    if (newSongs.length === 1) {
      await msg.channel.send(embed(`Added **${firstSong.title}** to the${addToFrontOfQueue ? ' front of the' : ''} queue${extraMsg} [${msg.author.username}]`));
    } else {
      await msg.channel.send(embed(`Added ${newSongs.length} tracks to the queue${extraMsg} [${msg.author.username}]`));
    }

    if (!wasPlayingSong) {
      // Only auto-play if nothing is playing
      if (player.voiceConnection === null) {
        await player.connect(targetVoiceChannel);
      }

      await player.play();
    }
  }
}
