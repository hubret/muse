import {Guild, VoiceChannel, User, Message} from 'discord.js';

export const isUserInVoice = (guild: Guild, user: User): boolean => {
  let inVoice = false;

  guild.channels.cache.filter(channel => channel.type === 'voice').forEach(channel => {
    if (channel.members.array().find(member => member.id === user.id)) {
      inVoice = true;
    }
  });

  return inVoice;
};

export const isAuthorInVoice = (msg: Message): boolean => {
  let {voiceChannel} = msg.author;
  if(!voiceChannel){
    return false;
  }else{
    return true;
  }
}

export const getSizeWithoutBots = (channel: VoiceChannel): number => channel.members.array().reduce((s, member) => {
  if (!member.user.bot) {
    s++;
  }

  return s;
}, 0);

export const getMostPopularVoiceChannel = (guild: Guild): [VoiceChannel, number] => {
  interface PopularResult {
    n: number;
    channel: VoiceChannel | null;
  }

  const voiceChannels: PopularResult[] = [];

  for (const [_, channel] of guild.channels.cache) {
    if (channel.type === 'voice') {
      const size = getSizeWithoutBots(channel as VoiceChannel);

      voiceChannels.push({
        channel: channel as VoiceChannel,
        n: size
      });
    }
  }

  // Find most popular channel
  const popularChannel = voiceChannels.reduce((popular: PopularResult, elem: PopularResult) => {
    if (elem.n > popular.n) {
      return elem;
    }

    return popular;
  }, {n: -1, channel: null});

  if (popularChannel.channel) {
    return [popularChannel.channel, popularChannel.n];
  }

  throw new Error();
};
