import {MessageEmbed} from 'discord.js'

export default (str: string): string => {
  return new MessageEmbed().setColor('#4C8F55').setDescription(str);
};
