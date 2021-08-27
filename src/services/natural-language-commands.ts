import {inject, injectable} from 'inversify';
import {Message, Guild} from 'discord.js';
import {TYPES} from '../types';
import PlayerManager from '../managers/player';
import {QueuedSong} from '../services/player';
import {getMostPopularVoiceChannel} from '../utils/channels';

@injectable()
export default class {
  private readonly playerManager: PlayerManager;

  constructor(@inject(TYPES.Managers.Player) playerManager: PlayerManager) {
    this.playerManager = playerManager;
  }

  async execute(msg: Message): Promise<boolean> {
    // if (msg.content.startsWith('say') && msg.content.endsWith('muse')) {
    //   const res = msg.content.slice(3, msg.content.indexOf('muse')).trim();

    //   await msg.channel.send(res);
    //   return true;
    // }

    if (msg.content.toLowerCase().includes('imagine dragons')) {
      await msg.channel.send('Imagine dragon my balls across your face');
      return true;
    }

    // if (msg.content.toLowerCase().includes('bitconnect')) {
    //   await Promise.all([
    //     msg.channel.send('🌊 🌊 🌊 🌊'),
    //     this.playClip(msg.guild!, {title: 'BITCONNEEECCT', artist: 'Carlos Matos', url: 'https://www.youtube.com/watch?v=lCcwn6bGUtU', length: 227, playlist: null, isLive: false}, 50, 13)
    //   ]);

    //   return true;
    // }

    return false;
  }

  private async playClip(guild: Guild, song: QueuedSong, position: number, duration: number): Promise<void> {
    const player = this.playerManager.get(guild.id);

    const [channel, n] = getMostPopularVoiceChannel(guild);

    if (!player.voiceConnection && n === 0) {
      return;
    }

    if (!player.voiceConnection) {
      await player.connect(channel);
    }

    const isPlaying = player.getCurrent() !== null;
    let oldPosition = 0;

    player.add(song, {immediate: true});

    if (isPlaying) {
      oldPosition = player.getPosition();

      player.manualForward(1);
    }

    await player.seek(position);

    return new Promise((resolve, reject) => {
      try {
        setTimeout(async () => {
          if (player.getCurrent()?.title === song.title) {
            player.removeCurrent();

            if (isPlaying) {
              await player.back();
              await player.seek(oldPosition);
            } else {
              player.disconnect();
            }
          }

          resolve();
        }, duration * 1000);
      } catch (error: unknown) {
        reject(error);
      }
    });
  }
}
