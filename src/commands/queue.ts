import {Message, MessageEmbed} from 'discord.js';
import {TYPES} from '../types';
import {inject, injectable} from 'inversify';
import PlayerManager from '../managers/player';
import {STATUS} from '../services/player';
import Command from '.';
import getProgressBar from '../utils/get-progress-bar';
import errorMsg from '../utils/error-msg';
import {prettyTime} from '../utils/time';
import getYouTubeID from 'get-youtube-id';
import embed from '../utils/embed';

const PAGE_SIZE = 10;

@injectable()
export default class implements Command {
  public name = 'queue';
  public aliases = ['q'];
  public examples = [
    ['queue', 'shows current queue'],
    ['queue 2', 'shows second page of queue']
  ];

  private readonly playerManager: PlayerManager;

  constructor(@inject(TYPES.Managers.Player) playerManager: PlayerManager) {
    this.playerManager = playerManager;
  }

  public async execute(msg: Message, args: string []): Promise<void> {
    const player = this.playerManager.get(msg.guild!.id);

    const currentSong = player.getCurrent();

    if (currentSong) {
      const queueSize = player.queueSize();

      const embed = new MessageEmbed();

      embed.setTitle(currentSong.title);
      embed.setURL(`https://www.youtube.com/watch?v=${currentSong.url.length === 11 ? currentSong.url : getYouTubeID(currentSong.url) ?? ''}`);

      let description = player.status === STATUS.PLAYING ? '⏹️' : '▶️';
      description += ' ';
      description += getProgressBar(20, player.getPosition() / currentSong.length);
      description += ' ';
      description += `\`[${prettyTime(player.getPosition())}/${currentSong.isLive ? 'live' : prettyTime(currentSong.length)}]\``;
      description += ' 🔉';
      description += player.isQueueEmpty() ? '' : '\n\n**Next up:**';

      embed.setDescription(description);

      let footer = `Source: ${currentSong.artist}`;

      if (currentSong.playlist) {
        footer += ` (${currentSong.playlist.title})`;
      }

      embed.setFooter(footer);

      player.getQueue().slice(player.getQueuePosition() - 3, player.getQueuePosition() + 3).forEach((song, i) => {
        embed.addField(`${(player.getQueuePosition() + i - 3).toString()}`, song.title, false);
      });

      await msg.channel.send(embed);
    } else {
      await msg.channel.send(embed('The queue is empty'));
    }
  }
}
