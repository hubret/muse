import {Message, MessageEmbed} from 'discord.js';
import {TYPES} from '../types';
import {inject, injectable} from 'inversify';
import PlayerManager from '../managers/player';
import Command from '.';
import embed from '../utils/embed';

@injectable()
export default class implements Command {
  public name = 'clear';
  public aliases = ['c'];
  public examples = [
    ['clear', 'clears all songs in queue except currently playing']
  ];

  public requiresVC = true;

  private readonly playerManager: PlayerManager;

  constructor(@inject(TYPES.Managers.Player) playerManager: PlayerManager) {
    this.playerManager = playerManager;
  }

  public async execute(msg: Message, _: string []): Promise<void> {
    this.playerManager.get(msg.guild!.id).clear();

    await msg.channel.send(embed(`Queue cleared`));
  }
}
