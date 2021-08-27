import {MessageEmbed} from 'discord.js'

export default (str: string): MessageEmbed => {
  return new MessageEmbed().setColor('#4C8F55').setDescription(str);
};
