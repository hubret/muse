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

      let description = '';
      description += getProgressBar(25, player.getPosition() / currentSong.length);
      description += ' ';
      description += `\`[${prettyTime(player.getPosition())}/${currentSong.isLive ? 'live' : prettyTime(currentSong.length)}]\``;
      description += player.isQueueEmpty() ? '' : '\n\n**Next up:**';

      description += '\n';
      description += '```ml\n';

      player.getQueue().forEach((song, i) => {
        if(Math.abs(i - player.getQueuePosition()) < 3){
          if(player.getQueuePosition() == i){
            description += '\n';
            description += '▶️\tNow Playing\n';
          }
          description += `${i+1} \t${song.title.substring(0, 55)}\n` ;
          if(player.getQueuePosition() == i){
            description += '\n';
          }
        }
      });

      if(player.queueSize() - player.getQueuePosition() > 3){
        const more = player.queueSize() - player.getQueuePosition() - 3;
        description += `...\n`
        description += `${more} more track${more == 1 ? '' : 's'}`
      }

      description += '```'

      embed.setDescription(description);

      await msg.channel.send(embed);
    } else {
      await msg.channel.send(embed('The queue is empty'));
    }
  }
}
